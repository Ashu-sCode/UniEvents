process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
process.env.MONGOMS_MD5_CHECK = '0';
process.env.MONGOMS_PREFER_GLOBAL_PATH = '0';
process.env.MONGOMS_DOWNLOAD_DIR = require('path').resolve(__dirname, '../../.mongodb-binaries');

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../app');
const Event = require('../models/Event.model');
const Ticket = require('../models/Ticket.model');
const Attendance = require('../models/Attendance.model');
const Notification = require('../models/Notification.model');
const User = require('../models/User.model');
const { approvalStatuses } = require('../models/User.model');
const { roles } = require('../config/auth.config');

let mongoServer;
const TEST_IMAGE_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO8B2w0AAAAASUVORK5CYII=',
  'base64'
);

jest.setTimeout(60000);

const createUserPayload = (overrides = {}) => ({
  name: 'Test User',
  email: `user-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
  password: 'secret123',
  rollNumber: `BCA-${Math.random().toString(16).slice(2, 8).toUpperCase()}`,
  department: 'Computer Science',
  role: 'student',
  ...overrides,
});

const signupUser = async (payload) => {
  let req = request(app)
    .post('/api/auth/signup')
    .field('name', payload.name)
    .field('email', payload.email)
    .field('password', payload.password)
    .field('department', payload.department)
    .field('role', payload.role || 'student');

  if (payload.rollNumber) {
    req = req.field('rollNumber', payload.rollNumber);
  }

  if ((payload.role || 'student') === 'student') {
    req = req.attach('idCard', TEST_IMAGE_BUFFER, {
      filename: 'id-card.png',
      contentType: 'image/png',
    });
  }

  const res = await req;
  return {
    response: res,
    token: res.body?.data?.token,
    user: res.body?.data?.user,
  };
};

const loginUser = async ({ email, password }) => {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return {
    response: res,
    token: res.body?.data?.token,
    user: res.body?.data?.user,
  };
};

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

const approveUser = async (userId, approvedBy = null) => {
  const user = await User.findById(userId);
  user.approvalStatus = approvalStatuses.APPROVED;
  user.approvedAt = new Date();
  user.approvedBy = approvedBy;
  user.rejectedAt = null;
  user.rejectedBy = null;
  user.rejectionReason = null;
  user.tokenVersion += 1;
  await user.save();
  return user;
};

const createAdmin = async () => {
  const admin = await User.create({
    name: 'Test Admin',
    email: `admin-${Date.now()}@example.com`,
    password: 'secret123',
    department: 'Administration',
    role: roles.ADMIN,
    approvalStatus: approvalStatuses.APPROVED,
    approvedAt: new Date(),
    isActive: true,
  });

  const login = await loginUser({ email: admin.email, password: 'secret123' });
  return { admin, token: login.token };
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), {
    dbName: 'unievent-test',
  });
});

afterEach(async () => {
  if (mongoose.connection.readyState !== 1) {
    return;
  }
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('UniEvent API integration', () => {
  test('student signup stays pending until approval and approved login can access profile', async () => {
    const signupPayload = createUserPayload();

    const signup = await signupUser(signupPayload);
    expect(signup.response.status).toBe(201);
    expect(signup.token).toBeTruthy();
    expect(signup.user.email).toBe(signupPayload.email.toLowerCase());
    expect(signup.user.role).toBe('student');
    expect(signup.user.approvalStatus).toBe('pending');
    expect(signup.user.idCardUrl).toBeTruthy();

    const loginRes = await request(app).post('/api/auth/login').send({
      email: signupPayload.email,
      password: signupPayload.password,
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.token).toBeTruthy();
    expect(loginRes.body.data.user.approvalStatus).toBe('pending');

    const pendingEvent = await Event.create({
      title: 'Pending Access Event',
      description: 'Used to verify pending students cannot register before approval.',
      organizerId: new mongoose.Types.ObjectId(),
      eventType: 'public',
      department: 'Computer Science',
      seatLimit: 10,
      registeredCount: 0,
      date: new Date('2099-02-01'),
      time: '09:00',
      venue: 'Main Auditorium',
      status: Event.EVENT_STATUS.PUBLISHED,
      enableCertificates: false,
    });

    const pendingAccessRes = await request(app)
      .post(`/api/tickets/register/${pendingEvent._id}`)
      .set(authHeader(loginRes.body.data.token));

    expect(pendingAccessRes.status).toBe(403);
    expect(pendingAccessRes.body.message).toMatch(/pending admin approval/i);

    await approveUser(signup.user.id);

    const approvedLogin = await request(app).post('/api/auth/login').send({
      email: signupPayload.email,
      password: signupPayload.password,
    });

    const profileRes = await request(app)
      .get('/api/auth/me')
      .set(authHeader(approvedLogin.body.data.token));

    expect(profileRes.status).toBe(200);
    expect(profileRes.body.data.user.email).toBe(signupPayload.email.toLowerCase());
    expect(profileRes.body.data.user.rollNumber).toBe(signupPayload.rollNumber);
    expect(profileRes.body.data.user.approvalStatus).toBe('approved');
  });

  test('organizer can create and publish an event', async () => {
    const organizer = await signupUser(createUserPayload({
      name: 'Organizer One',
      email: 'organizer1@example.com',
      department: 'Computer Science',
      role: 'organizer',
      rollNumber: undefined,
    }));
    await approveUser(organizer.user.id);
    const organizerLogin = await loginUser({
      email: 'organizer1@example.com',
      password: 'secret123',
    });

    const createRes = await request(app)
      .post('/api/events')
      .set(authHeader(organizerLogin.token))
      .send({
        title: 'Full Stack Workshop',
        description: 'Hands-on workshop for MERN stack fundamentals and deployment.',
        eventType: 'public',
        department: 'Computer Science',
        seatLimit: 50,
        date: '2099-01-15',
        time: '10:30',
        venue: 'Seminar Hall',
        enableCertificates: true,
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.event.status).toBe('draft');

    const updateRes = await request(app)
      .put(`/api/events/${createRes.body.data.event._id}`)
      .set(authHeader(organizerLogin.token))
      .send({ status: 'published' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.event.status).toBe('published');

    const listRes = await request(app)
      .get('/api/events')
      .set(authHeader(organizerLogin.token));

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.events).toHaveLength(1);
  });

  test('organizer can edit an event including waitlist and certificate flags', async () => {
    const organizer = await signupUser(createUserPayload({
      name: 'Organizer Edit',
      email: 'organizer-edit@example.com',
      department: 'Computer Science',
      role: 'organizer',
      rollNumber: undefined,
    }));
    await approveUser(organizer.user.id);
    const organizerLogin = await loginUser({
      email: 'organizer-edit@example.com',
      password: 'secret123',
    });

    const createRes = await request(app)
      .post('/api/events')
      .set(authHeader(organizerLogin.token))
      .send({
        title: 'Edit Flow Workshop',
        description: 'Initial event details for validating organizer-side updates.',
        eventType: 'public',
        department: 'Computer Science',
        seatLimit: 25,
        date: '2099-01-15',
        time: '10:30',
        venue: 'Seminar Hall',
        enableCertificates: false,
        waitlistEnabled: true,
      });

    expect(createRes.status).toBe(201);

    const updateRes = await request(app)
      .put(`/api/events/${createRes.body.data.event._id}`)
      .set(authHeader(organizerLogin.token))
      .send({
        title: 'Edit Flow Workshop Updated',
        seatLimit: 40,
        enableCertificates: true,
        waitlistEnabled: false,
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.event.title).toBe('Edit Flow Workshop Updated');
    expect(updateRes.body.data.event.seatLimit).toBe(40);
    expect(updateRes.body.data.event.enableCertificates).toBe(true);
    expect(updateRes.body.data.event.waitlistEnabled).toBe(false);
  });

  test('student can register once for a published event and duplicate registration is blocked', async () => {
    const organizer = await signupUser(createUserPayload({
      name: 'Organizer Two',
      email: 'organizer2@example.com',
      department: 'Computer Science',
      role: 'organizer',
      rollNumber: undefined,
    }));
    const student = await signupUser(createUserPayload({
      name: 'Student One',
      email: 'student1@example.com',
      department: 'Computer Science',
    }));
    await approveUser(organizer.user.id);
    await approveUser(student.user.id);
    const organizerLogin = await loginUser({ email: 'organizer2@example.com', password: 'secret123' });
    const studentLogin = await loginUser({ email: 'student1@example.com', password: 'secret123' });

    const createdEvent = await Event.create({
      title: 'Campus Orientation',
      description: 'Orientation programme for newly admitted students with campus tour.',
      organizerId: organizerLogin.user.id,
      eventType: 'public',
      department: 'Computer Science',
      seatLimit: 2,
      registeredCount: 0,
      date: new Date('2099-02-01'),
      time: '09:00',
      venue: 'Main Auditorium',
      status: Event.EVENT_STATUS.PUBLISHED,
      enableCertificates: false,
    });

    const registerRes = await request(app)
      .post(`/api/tickets/register/${createdEvent._id}`)
      .set(authHeader(studentLogin.token));

    expect(registerRes.status).toBe(201);
    expect(registerRes.body.data.ticket.ticketId).toMatch(/^TKT-/);
    expect(registerRes.body.data.ticket.status).toBe('unused');

    const updatedEvent = await Event.findById(createdEvent._id);
    expect(updatedEvent.registeredCount).toBe(1);

    const duplicateRes = await request(app)
      .post(`/api/tickets/register/${createdEvent._id}`)
      .set(authHeader(studentLogin.token));

    expect(duplicateRes.status).toBe(400);
    expect(duplicateRes.body.message).toMatch(/already registered/i);

    const tickets = await Ticket.find({ eventId: createdEvent._id });
    expect(tickets).toHaveLength(1);
  });

  test('organizer can verify a valid ticket and attendance is recorded', async () => {
    const organizer = await signupUser(createUserPayload({
      name: 'Organizer Three',
      email: 'organizer3@example.com',
      department: 'Computer Science',
      role: 'organizer',
      rollNumber: undefined,
    }));
    const student = await signupUser(createUserPayload({
      name: 'Student Two',
      email: 'student2@example.com',
      department: 'Computer Science',
    }));
    await approveUser(organizer.user.id);
    await approveUser(student.user.id);
    const organizerLogin = await loginUser({ email: 'organizer3@example.com', password: 'secret123' });
    const studentLogin = await loginUser({ email: 'student2@example.com', password: 'secret123' });

    const event = await Event.create({
      title: 'Developer Meetup',
      description: 'Interactive technical meetup with guest lectures and networking.',
      organizerId: organizerLogin.user.id,
      eventType: 'public',
      department: 'Computer Science',
      seatLimit: 100,
      registeredCount: 0,
      date: new Date('2099-03-10'),
      time: '14:00',
      venue: 'Innovation Lab',
      status: Event.EVENT_STATUS.PUBLISHED,
      enableCertificates: true,
    });

    const registerRes = await request(app)
      .post(`/api/tickets/register/${event._id}`)
      .set(authHeader(studentLogin.token));

    const ticketId = registerRes.body.data.ticket.ticketId;
    expect(ticketId).toBeTruthy();

    const verifyRes = await request(app)
      .post('/api/tickets/verify')
      .set(authHeader(organizerLogin.token))
      .send({
        ticketId,
        eventId: event._id.toString(),
      });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.verification.valid).toBe(true);
    expect(verifyRes.body.verification.attendee.name).toBe('Student Two');

    const ticket = await Ticket.findOne({ ticketId });
    expect(ticket.status).toBe('used');
    expect(ticket.usedAt).toBeTruthy();

    const attendance = await Attendance.findOne({ eventId: event._id, userId: studentLogin.user.id });
    expect(attendance).toBeTruthy();

    const secondVerifyRes = await request(app)
      .post('/api/tickets/verify')
      .set(authHeader(organizerLogin.token))
      .send({
        ticketId,
        eventId: event._id.toString(),
      });

    expect(secondVerifyRes.status).toBe(400);
    expect(secondVerifyRes.body.verification.reason).toBe('ALREADY_USED');
  });

  test('full events can use waitlist and cancelled seats promote the oldest waitlisted ticket', async () => {
    const organizerPayload = createUserPayload({
      name: 'Organizer Four',
      email: `organizer4-${Date.now()}@example.com`,
      department: 'Computer Science',
      role: 'organizer',
      rollNumber: undefined,
    });
    const studentOnePayload = createUserPayload({
      name: 'Student Three',
      email: `student3-${Date.now()}@example.com`,
      department: 'Computer Science',
    });
    const studentTwoPayload = createUserPayload({
      name: 'Student Four',
      email: `student4-${Date.now()}@example.com`,
      department: 'Computer Science',
    });

    const organizerSignup = await signupUser(organizerPayload);
    const studentOneSignup = await signupUser(studentOnePayload);
    const studentTwoSignup = await signupUser(studentTwoPayload);

    expect(organizerSignup.response.status).toBe(201);
    expect(studentOneSignup.response.status).toBe(201);
    expect(studentTwoSignup.response.status).toBe(201);

    await approveUser(organizerSignup.user.id);
    await approveUser(studentOneSignup.user.id);
    await approveUser(studentTwoSignup.user.id);

    const organizer = await loginUser(organizerPayload);
    const studentOne = await loginUser(studentOnePayload);
    const studentTwo = await loginUser(studentTwoPayload);

    expect(organizer.response.status).toBe(200);
    expect(studentOne.response.status).toBe(200);
    expect(studentTwo.response.status).toBe(200);

    const event = await Event.create({
      title: 'Limited Lab Session',
      description: 'Hands-on lab with only one available machine slot.',
      organizerId: organizer.user.id,
      eventType: 'public',
      department: 'Computer Science',
      seatLimit: 1,
      registeredCount: 0,
      waitlistCount: 0,
      waitlistEnabled: true,
      date: new Date('2099-04-10'),
      time: '11:00',
      venue: 'Lab 2',
      status: Event.EVENT_STATUS.PUBLISHED,
      enableCertificates: false,
    });

    const firstRegistration = await request(app)
      .post(`/api/tickets/register/${event._id}`)
      .set(authHeader(studentOne.token));

    expect(firstRegistration.status).toBe(201);
    expect(firstRegistration.body.data.registrationType).toBe('confirmed');

    const secondRegistration = await request(app)
      .post(`/api/tickets/register/${event._id}`)
      .set(authHeader(studentTwo.token));

    expect(secondRegistration.status).toBe(201);
    expect(secondRegistration.body.data.registrationType).toBe('waitlist');
    expect(secondRegistration.body.data.ticket.status).toBe('waitlisted');
    expect(secondRegistration.body.data.waitlistPosition).toBe(1);

    const waitlistedBeforePromotion = await Ticket.findOne({ userId: studentTwo.user.id });
    expect(waitlistedBeforePromotion.status).toBe('waitlisted');

    const cancelRes = await request(app)
      .patch(`/api/tickets/${firstRegistration.body.data.ticket.ticketId}/cancel`)
      .set(authHeader(organizer.token));

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.promotedTicket.ticketId).toBe(secondRegistration.body.data.ticket.ticketId);

    const promotedTicket = await Ticket.findOne({ ticketId: secondRegistration.body.data.ticket.ticketId });
    expect(promotedTicket.status).toBe('unused');
    expect(promotedTicket.promotedAt).toBeTruthy();

    const refreshedEvent = await Event.findById(event._id);
    expect(refreshedEvent.registeredCount).toBe(1);
    expect(refreshedEvent.waitlistCount).toBe(0);
  });

  test('notifications are created and can be marked as read', async () => {
    const organizerPayload = createUserPayload({
      name: 'Organizer Notify',
      email: `organizer-notify-${Date.now()}@example.com`,
      department: 'Computer Science',
      role: 'organizer',
      rollNumber: undefined,
    });
    const studentPayload = createUserPayload({
      name: 'Student Notify',
      email: `student-notify-${Date.now()}@example.com`,
      department: 'Computer Science',
    });

    await signupUser(organizerPayload);
    await signupUser(studentPayload);

    const organizerRecord = await User.findOne({ email: organizerPayload.email.toLowerCase() });
    const studentRecord = await User.findOne({ email: studentPayload.email.toLowerCase() });
    await approveUser(organizerRecord._id);
    await approveUser(studentRecord._id);

    const organizer = await loginUser(organizerPayload);
    const student = await loginUser(studentPayload);

    const event = await Event.create({
      title: 'Notification Demo Event',
      description: 'Testing that registration and event updates create visible notifications.',
      organizerId: organizer.user.id,
      eventType: 'public',
      department: 'Computer Science',
      seatLimit: 3,
      registeredCount: 0,
      waitlistCount: 0,
      waitlistEnabled: true,
      date: new Date('2099-05-10'),
      time: '12:00',
      venue: 'Hall A',
      status: Event.EVENT_STATUS.PUBLISHED,
      enableCertificates: false,
    });

    const registerRes = await request(app)
      .post(`/api/tickets/register/${event._id}`)
      .set(authHeader(student.token));

    expect(registerRes.status).toBe(201);

    const organizerNotifications = await request(app)
      .get('/api/notifications')
      .set(authHeader(organizer.token));

    expect(organizerNotifications.status).toBe(200);
    expect(organizerNotifications.body.data.unreadCount).toBeGreaterThan(0);
    expect(organizerNotifications.body.data.notifications[0].title).toMatch(/registration|waitlist/i);

    const studentNotifications = await request(app)
      .get('/api/notifications')
      .set(authHeader(student.token));

    expect(studentNotifications.status).toBe(200);
    expect(studentNotifications.body.data.notifications.length).toBeGreaterThan(0);

    const firstNotificationId = studentNotifications.body.data.notifications[0]._id;

    const markReadRes = await request(app)
      .patch(`/api/notifications/${firstNotificationId}/read`)
      .set(authHeader(student.token));

    expect(markReadRes.status).toBe(200);
    expect(markReadRes.body.data.notification.isRead).toBe(true);

    const updateRes = await request(app)
      .put(`/api/events/${event._id}`)
      .set(authHeader(organizer.token))
      .send({
        venue: 'Hall B',
        time: '13:00',
      });

    expect(updateRes.status).toBe(200);

    const eventUpdateNotification = await Notification.findOne({
      userId: student.user.id,
      type: 'event_updated',
    });
    expect(eventUpdateNotification).toBeTruthy();
  });

  test('admin can review pending users and approve or reject them', async () => {
    const { token: adminToken, admin } = await createAdmin();
    const studentSignup = await signupUser(createUserPayload({
      name: 'Pending Student',
      email: `pending-student-${Date.now()}@example.com`,
    }));
    const organizerSignup = await signupUser(createUserPayload({
      name: 'Pending Organizer',
      email: `pending-organizer-${Date.now()}@example.com`,
      role: 'organizer',
      rollNumber: undefined,
    }));

    const summaryRes = await request(app)
      .get('/api/admin/summary')
      .set(authHeader(adminToken));

    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.data.summary.pendingStudents).toBe(1);
    expect(summaryRes.body.data.summary.pendingOrganizers).toBe(1);

    const listRes = await request(app)
      .get('/api/admin/users')
      .set(authHeader(adminToken));

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.users).toHaveLength(3);

    const idCardRes = await request(app)
      .get(`/api/admin/users/${studentSignup.user.id}/id-card`)
      .set(authHeader(adminToken));

    expect(idCardRes.status).toBe(200);
    expect(idCardRes.headers['content-type']).toMatch(/image/);

    const approveRes = await request(app)
      .post(`/api/admin/users/${studentSignup.user.id}/approve`)
      .set(authHeader(adminToken));

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.user.approvalStatus).toBe('approved');

    const rejectRes = await request(app)
      .post(`/api/admin/users/${organizerSignup.user.id}/reject`)
      .set(authHeader(adminToken))
      .send({ reason: 'Please contact administration with department authorization.' });

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.data.user.approvalStatus).toBe('rejected');

    const rejectedLogin = await loginUser({
      email: organizerSignup.user.email,
      password: 'secret123',
    });

    expect(rejectedLogin.response.status).toBe(200);
    expect(rejectedLogin.user.approvalStatus).toBe('rejected');
    expect(rejectedLogin.user.rejectionReason).toMatch(/contact administration/i);

    const storedStudent = await User.findById(studentSignup.user.id);
    const storedOrganizer = await User.findById(organizerSignup.user.id);
    expect(storedStudent.approvedBy.toString()).toBe(admin._id.toString());
    expect(storedOrganizer.rejectedBy.toString()).toBe(admin._id.toString());
  });

  test('admin can inspect user detail history and deactivate or reactivate an account', async () => {
    const { token: adminToken, admin } = await createAdmin();
    const signup = await signupUser(createUserPayload({
      name: 'Lifecycle Student',
      email: `lifecycle-${Date.now()}@example.com`,
    }));

    const approveRes = await request(app)
      .post(`/api/admin/users/${signup.user.id}/approve`)
      .set(authHeader(adminToken));

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.user.approvalMetadata.approvedBy.email).toBe(admin.email);

    const detailRes = await request(app)
      .get(`/api/admin/users/${signup.user.id}`)
      .set(authHeader(adminToken));

    expect(detailRes.status).toBe(200);
    expect(detailRes.body.data.user.id).toBe(signup.user.id);
    expect(detailRes.body.data.user.approvalMetadata.approvedBy.name).toBe(admin.name);
    expect(detailRes.body.data.user.hasIdCard).toBe(true);

    const deactivateRes = await request(app)
      .patch(`/api/admin/users/${signup.user.id}/active-state`)
      .set(authHeader(adminToken))
      .send({ isActive: false });

    expect(deactivateRes.status).toBe(200);
    expect(deactivateRes.body.data.user.isActive).toBe(false);

    const deactivatedLogin = await loginUser({
      email: signup.user.email,
      password: 'secret123',
    });

    expect(deactivatedLogin.response.status).toBe(401);
    expect(deactivatedLogin.response.body.message).toMatch(/deactivated/i);

    const reactivateRes = await request(app)
      .patch(`/api/admin/users/${signup.user.id}/active-state`)
      .set(authHeader(adminToken))
      .send({ isActive: true });

    expect(reactivateRes.status).toBe(200);
    expect(reactivateRes.body.data.user.isActive).toBe(true);

    const reactivatedLogin = await loginUser({
      email: signup.user.email,
      password: 'secret123',
    });

    expect(reactivatedLogin.response.status).toBe(200);
    expect(reactivatedLogin.user.approvalStatus).toBe('approved');
  });

});
