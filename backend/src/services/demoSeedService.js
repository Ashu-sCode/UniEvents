const User = require('../models/User.model');
const Event = require('../models/Event.model');
const Ticket = require('../models/Ticket.model');
const Attendance = require('../models/Attendance.model');
const Certificate = require('../models/Certificate.model');
const { generateQRCode } = require('../utils/qrGenerator');
const { STREAM_OPTIONS } = require('../config/streams');

const DEMO_USERS = [
  {
    name: 'Demo Organizer',
    email: 'organizer.demo@unievent.local',
    password: 'demo1234',
    department: STREAM_OPTIONS[0],
    role: 'organizer',
  },
  {
    name: 'Aarav Sharma',
    email: 'student.demo1@unievent.local',
    password: 'demo1234',
    rollNumber: 'BCA-001',
    department: STREAM_OPTIONS[0],
    role: 'student',
  },
  {
    name: 'Riya Patel',
    email: 'student.demo2@unievent.local',
    password: 'demo1234',
    rollNumber: 'BSC-014',
    department: STREAM_OPTIONS[1],
    role: 'student',
  },
  {
    name: 'Kabir Mehta',
    email: 'student.demo3@unievent.local',
    password: 'demo1234',
    rollNumber: 'BBA-022',
    department: STREAM_OPTIONS[5],
    role: 'student',
  },
  {
    name: 'Sneha Verma',
    email: 'student.demo4@unievent.local',
    password: 'demo1234',
    rollNumber: 'DIP-009',
    department: STREAM_OPTIONS[6],
    role: 'student',
  },
];

const addDays = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

async function ensureUser(seedUser) {
  let user = await User.findOne({ email: seedUser.email });
  if (!user) {
    user = await User.create(seedUser);
  }
  return user;
}

async function ensureEvent(organizer, payload) {
  let event = await Event.findOne({ organizerId: organizer._id, title: payload.title });
  if (!event) {
    event = await Event.create({
      ...payload,
      organizerId: organizer._id,
    });
  }
  return event;
}

async function ensureTicket({ event, user, status = Ticket.TICKET_STATUS.UNUSED, usedAt = null, waitlistedAt = null, promotedAt = null }) {
  let ticket = await Ticket.findOne({ eventId: event._id, userId: user._id });

  if (!ticket) {
    ticket = new Ticket({
      eventId: event._id,
      userId: user._id,
      qrCode: 'pending',
      status,
      usedAt,
      waitlistedAt,
      promotedAt,
    });
    ticket.qrCode = await generateQRCode(ticket.ticketId);
    await ticket.save();
  }

  return ticket;
}

async function ensureAttendance({ event, user, ticket, organizer, entryTime }) {
  const existing = await Attendance.findOne({ eventId: event._id, userId: user._id });
  if (!existing) {
    await Attendance.create({
      eventId: event._id,
      userId: user._id,
      ticketId: ticket._id,
      verifiedBy: organizer._id,
      entryTime,
    });
  }
}

async function ensureCertificate({ event, user, organizer }) {
  const existing = await Certificate.findOne({ eventId: event._id, userId: user._id });
  if (!existing) {
    await Certificate.create({
      eventId: event._id,
      userId: user._id,
      issuedBy: organizer._id,
      issuedAt: new Date(),
    });
  }
}

async function ensureDemoData() {
  const existingDemoOrganizer = await User.findOne({ email: DEMO_USERS[0].email });
  if (existingDemoOrganizer) {
    return {
      seeded: false,
      reason: 'Demo data already present',
    };
  }

  const [organizer, studentOne, studentTwo, studentThree, studentFour] = await Promise.all(
    DEMO_USERS.map((user) => ensureUser(user))
  );

  const upcomingOpenEvent = await ensureEvent(organizer, {
    title: 'Campus Innovation Summit',
    description: 'A public showcase of student startups, AI demos, and live tech talks for the entire campus.',
    eventType: Event.EVENT_TYPES.PUBLIC,
    department: STREAM_OPTIONS[0],
    seatLimit: 120,
    registeredCount: 2,
    waitlistCount: 0,
    date: addDays(7),
    time: '11:00',
    venue: 'Main Auditorium',
    status: Event.EVENT_STATUS.PUBLISHED,
    enableCertificates: false,
    waitlistEnabled: true,
  });

  const upcomingFullEvent = await ensureEvent(organizer, {
    title: 'Portfolio Review Workshop',
    description: 'A limited-seat departmental workshop with resume and portfolio feedback from faculty mentors.',
    eventType: Event.EVENT_TYPES.DEPARTMENTAL,
    department: STREAM_OPTIONS[0],
    seatLimit: 1,
    registeredCount: 1,
    waitlistCount: 1,
    date: addDays(3),
    time: '14:30',
    venue: 'Seminar Hall 2',
    status: Event.EVENT_STATUS.PUBLISHED,
    enableCertificates: true,
    waitlistEnabled: true,
  });

  const completedWorkshop = await ensureEvent(organizer, {
    title: 'Full Stack Bootcamp',
    description: 'A completed hands-on workshop covering frontend, backend, deployment, and certificate issuance flow.',
    eventType: Event.EVENT_TYPES.PUBLIC,
    department: STREAM_OPTIONS[5],
    seatLimit: 60,
    registeredCount: 2,
    waitlistCount: 0,
    date: addDays(-12),
    time: '10:00',
    venue: 'Innovation Lab',
    status: Event.EVENT_STATUS.COMPLETED,
    enableCertificates: true,
    waitlistEnabled: true,
  });

  await ensureEvent(organizer, {
    title: 'Freshers Welcome Draft',
    description: 'A draft event used to demonstrate organizer editing and publishing workflows.',
    eventType: Event.EVENT_TYPES.PUBLIC,
    department: STREAM_OPTIONS[3],
    seatLimit: 200,
    registeredCount: 0,
    waitlistCount: 0,
    date: addDays(20),
    time: '16:00',
    venue: 'Open Air Theatre',
    status: Event.EVENT_STATUS.DRAFT,
    enableCertificates: false,
    waitlistEnabled: true,
  });

  const openTicketOne = await ensureTicket({ event: upcomingOpenEvent, user: studentOne });
  await ensureTicket({ event: upcomingOpenEvent, user: studentTwo });

  const confirmedWorkshopTicket = await ensureTicket({ event: upcomingFullEvent, user: studentTwo });
  await ensureTicket({
    event: upcomingFullEvent,
    user: studentOne,
    status: Ticket.TICKET_STATUS.WAITLISTED,
    waitlistedAt: new Date(),
  });

  const usedTicketOne = await ensureTicket({
    event: completedWorkshop,
    user: studentTwo,
    status: Ticket.TICKET_STATUS.USED,
    usedAt: new Date(addDays(-12).setHours(10, 30, 0, 0)),
  });
  const usedTicketTwo = await ensureTicket({
    event: completedWorkshop,
    user: studentThree,
    status: Ticket.TICKET_STATUS.USED,
    usedAt: new Date(addDays(-12).setHours(10, 45, 0, 0)),
  });

  await ensureAttendance({
    event: completedWorkshop,
    user: studentTwo,
    ticket: usedTicketOne,
    organizer,
    entryTime: usedTicketOne.usedAt,
  });
  await ensureAttendance({
    event: completedWorkshop,
    user: studentThree,
    ticket: usedTicketTwo,
    organizer,
    entryTime: usedTicketTwo.usedAt,
  });

  await ensureCertificate({ event: completedWorkshop, user: studentTwo, organizer });
  await ensureCertificate({ event: completedWorkshop, user: studentThree, organizer });

  return {
    seeded: true,
    credentials: {
      organizer: {
        email: organizer.email,
        password: 'demo1234',
      },
      student: {
        email: studentOne.email,
        password: 'demo1234',
      },
    },
    demoRefs: {
      openTicketId: openTicketOne.ticketId,
      confirmedWorkshopTicketId: confirmedWorkshopTicket.ticketId,
    },
  };
}

module.exports = {
  ensureDemoData,
};
