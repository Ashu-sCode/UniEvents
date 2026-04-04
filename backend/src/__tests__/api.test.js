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

let mongoServer;

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
  const res = await request(app).post('/api/auth/signup').send(payload);
  return {
    response: res,
    token: res.body?.data?.token,
    user: res.body?.data?.user,
  };
};

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

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
  test('signup, login, and profile flow works for a student', async () => {
    const signupPayload = createUserPayload();

    const signup = await signupUser(signupPayload);
    expect(signup.response.status).toBe(201);
    expect(signup.token).toBeTruthy();
    expect(signup.user.email).toBe(signupPayload.email.toLowerCase());
    expect(signup.user.role).toBe('student');

    const loginRes = await request(app).post('/api/auth/login').send({
      email: signupPayload.email,
      password: signupPayload.password,
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.token).toBeTruthy();

    const profileRes = await request(app)
      .get('/api/auth/me')
      .set(authHeader(loginRes.body.data.token));

    expect(profileRes.status).toBe(200);
    expect(profileRes.body.data.user.email).toBe(signupPayload.email.toLowerCase());
    expect(profileRes.body.data.user.rollNumber).toBe(signupPayload.rollNumber);
  });

  test('organizer can create and publish an event', async () => {
    const organizer = await signupUser(createUserPayload({
      name: 'Organizer One',
      email: 'organizer1@example.com',
      department: 'Computer Science',
      role: 'organizer',
      rollNumber: undefined,
    }));

    const createRes = await request(app)
      .post('/api/events')
      .set(authHeader(organizer.token))
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
      .set(authHeader(organizer.token))
      .send({ status: 'published' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.event.status).toBe('published');

    const listRes = await request(app)
      .get('/api/events')
      .set(authHeader(organizer.token));

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.events).toHaveLength(1);
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

    const createdEvent = await Event.create({
      title: 'Campus Orientation',
      description: 'Orientation programme for newly admitted students with campus tour.',
      organizerId: organizer.user.id,
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
      .set(authHeader(student.token));

    expect(registerRes.status).toBe(201);
    expect(registerRes.body.data.ticket.ticketId).toMatch(/^TKT-/);
    expect(registerRes.body.data.ticket.status).toBe('unused');

    const updatedEvent = await Event.findById(createdEvent._id);
    expect(updatedEvent.registeredCount).toBe(1);

    const duplicateRes = await request(app)
      .post(`/api/tickets/register/${createdEvent._id}`)
      .set(authHeader(student.token));

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

    const event = await Event.create({
      title: 'Developer Meetup',
      description: 'Interactive technical meetup with guest lectures and networking.',
      organizerId: organizer.user.id,
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
      .set(authHeader(student.token));

    const ticketId = registerRes.body.data.ticket.ticketId;
    expect(ticketId).toBeTruthy();

    const verifyRes = await request(app)
      .post('/api/tickets/verify')
      .set(authHeader(organizer.token))
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

    const attendance = await Attendance.findOne({ eventId: event._id, userId: student.user.id });
    expect(attendance).toBeTruthy();

    const secondVerifyRes = await request(app)
      .post('/api/tickets/verify')
      .set(authHeader(organizer.token))
      .send({
        ticketId,
        eventId: event._id.toString(),
      });

    expect(secondVerifyRes.status).toBe(400);
    expect(secondVerifyRes.body.verification.reason).toBe('ALREADY_USED');
  });

  test('full events can use waitlist and cancelled seats promote the oldest waitlisted ticket', async () => {
    const organizer = await signupUser(createUserPayload({
      name: 'Organizer Four',
      email: 'organizer4@example.com',
      department: 'Computer Science',
      role: 'organizer',
      rollNumber: undefined,
    }));
    const studentOne = await signupUser(createUserPayload({
      name: 'Student Three',
      email: 'student3@example.com',
      department: 'Computer Science',
    }));
    const studentTwo = await signupUser(createUserPayload({
      name: 'Student Four',
      email: 'student4@example.com',
      department: 'Computer Science',
    }));

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
});
