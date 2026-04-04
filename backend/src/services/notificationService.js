const Notification = require('../models/Notification.model');
const Ticket = require('../models/Ticket.model');

const createNotification = async ({
  userId,
  type,
  title,
  message,
  link = null,
  metadata = {},
}) => {
  if (!userId) {
    return null;
  }

  return Notification.create({
    userId,
    type,
    title,
    message,
    link,
    metadata,
  });
};

const createNotifications = async (items) => {
  const notifications = items.filter((item) => item?.userId);
  if (notifications.length === 0) {
    return [];
  }

  return Notification.insertMany(notifications, { ordered: false });
};

const notifyOrganizerRegistration = async ({
  organizerId,
  event,
  student,
  registrationType,
  ticket,
}) => {
  const isWaitlist = registrationType === 'waitlist';

  return createNotification({
    userId: organizerId,
    type: isWaitlist
      ? Notification.NOTIFICATION_TYPES.WAITLIST_JOINED
      : Notification.NOTIFICATION_TYPES.REGISTRATION_CONFIRMED,
    title: isWaitlist ? 'New waitlist request' : 'New registration',
    message: isWaitlist
      ? `${student.name} joined the waitlist for ${event.title}.`
      : `${student.name} registered for ${event.title}.`,
    link: event?._id ? `/dashboard/organizer/events/${event._id}` : '/dashboard/organizer',
    metadata: {
      eventId: event?._id?.toString?.() || event?._id,
      ticketId: ticket?.ticketId,
      studentId: student?._id?.toString?.() || student?._id,
      registrationType,
    },
  });
};

const notifyStudentRegistration = async ({
  userId,
  event,
  registrationType,
  waitlistPosition = null,
  ticket,
}) => {
  const isWaitlist = registrationType === 'waitlist';

  return createNotification({
    userId,
    type: isWaitlist
      ? Notification.NOTIFICATION_TYPES.WAITLIST_JOINED
      : Notification.NOTIFICATION_TYPES.REGISTRATION_CONFIRMED,
    title: isWaitlist ? 'Added to waitlist' : 'Registration confirmed',
    message: isWaitlist
      ? `You joined the waitlist for ${event.title}${waitlistPosition ? ` at position #${waitlistPosition}` : ''}.`
      : `Your registration for ${event.title} is confirmed.`,
    link: '/dashboard/student?tab=tickets',
    metadata: {
      eventId: event?._id?.toString?.() || event?._id,
      ticketId: ticket?.ticketId,
      waitlistPosition,
      registrationType,
    },
  });
};

const notifyWaitlistPromotion = async ({
  ticket,
  event,
  organizerId,
}) => {
  const notifications = [
    {
      userId: ticket.userId?._id || ticket.userId,
      type: Notification.NOTIFICATION_TYPES.WAITLIST_PROMOTED,
      title: 'Seat confirmed from waitlist',
      message: `A seat opened for ${event.title}. Your waitlisted ticket is now confirmed.`,
      link: '/dashboard/student?tab=tickets',
      metadata: {
        eventId: event?._id?.toString?.() || event?._id,
        ticketId: ticket.ticketId,
      },
    },
  ];

  if (organizerId) {
    notifications.push({
      userId: organizerId,
      type: Notification.NOTIFICATION_TYPES.WAITLIST_PROMOTED,
      title: 'Waitlist promoted',
      message: `${ticket.userId?.name || 'A student'} was promoted from the waitlist for ${event.title}.`,
      link: event?._id ? `/dashboard/organizer/events/${event._id}` : '/dashboard/organizer',
      metadata: {
        eventId: event?._id?.toString?.() || event?._id,
        ticketId: ticket.ticketId,
        studentId: ticket.userId?._id?.toString?.() || ticket.userId?._id,
      },
    });
  }

  return createNotifications(notifications);
};

const notifyTicketCancellation = async ({
  userId,
  event,
  ticket,
}) => {
  return createNotification({
    userId,
    type: Notification.NOTIFICATION_TYPES.REGISTRATION_CANCELLED,
    title: 'Registration cancelled',
    message: `Your registration for ${event.title} was cancelled by the organizer.`,
    link: '/dashboard/student?tab=tickets',
    metadata: {
      eventId: event?._id?.toString?.() || event?._id,
      ticketId: ticket?.ticketId,
    },
  });
};

const notifyAttendanceMarked = async ({
  userId,
  event,
  ticketId,
}) => {
  return createNotification({
    userId,
    type: Notification.NOTIFICATION_TYPES.ATTENDANCE_MARKED,
    title: 'Attendance marked',
    message: `Your attendance was marked for ${event.title}.`,
    link: '/dashboard/student?tab=tickets',
    metadata: {
      eventId: event?._id?.toString?.() || event?._id,
      ticketId,
    },
  });
};

const buildEventUpdateNotification = ({ event, previous }) => {
  if (previous.status !== event.status) {
    if (event.status === 'published') {
      return {
        type: Notification.NOTIFICATION_TYPES.EVENT_PUBLISHED,
        title: 'Event is now live',
        message: `${event.title} is now published and open for registrations.`,
      };
    }

    if (event.status === 'cancelled') {
      return {
        type: Notification.NOTIFICATION_TYPES.EVENT_CANCELLED,
        title: 'Event cancelled',
        message: `${event.title} has been cancelled. Please check with the organizer for the next update.`,
      };
    }
  }

  const changedParts = [];
  if (String(previous.date) !== String(event.date)) changedParts.push('date');
  if (previous.time !== event.time) changedParts.push('time');
  if (previous.venue !== event.venue) changedParts.push('venue');
  if (previous.seatLimit !== event.seatLimit) changedParts.push('seat limit');

  if (changedParts.length === 0) {
    return null;
  }

  return {
    type: Notification.NOTIFICATION_TYPES.EVENT_UPDATED,
    title: 'Event updated',
    message: `${event.title} was updated. Changed: ${changedParts.join(', ')}.`,
  };
};

const notifyEventAudience = async ({ event, previous }) => {
  const notification = buildEventUpdateNotification({ event, previous });
  if (!notification) {
    return [];
  }

  const tickets = await Ticket.find({
    eventId: event._id,
    status: { $in: [Ticket.TICKET_STATUS.UNUSED, Ticket.TICKET_STATUS.WAITLISTED, Ticket.TICKET_STATUS.USED] },
  }).select('userId ticketId');

  const uniqueUserIds = [...new Set(tickets.map((ticket) => ticket.userId.toString()))];

  return createNotifications(
    uniqueUserIds.map((userId) => ({
      userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      link: '/dashboard/student?tab=tickets',
      metadata: {
        eventId: event._id.toString(),
      },
    }))
  );
};

const notifyCertificateReady = async ({ certificate, event, user }) => {
  return createNotification({
    userId: user._id,
    type: Notification.NOTIFICATION_TYPES.CERTIFICATE_READY,
    title: 'Certificate ready',
    message: `Your certificate for ${event.title} is ready to view and download.`,
    link: '/dashboard/student?tab=certificates',
    metadata: {
      eventId: event._id.toString(),
      certificateId: certificate.certificateId,
    },
  });
};

module.exports = {
  createNotification,
  createNotifications,
  notifyOrganizerRegistration,
  notifyStudentRegistration,
  notifyWaitlistPromotion,
  notifyTicketCancellation,
  notifyAttendanceMarked,
  notifyEventAudience,
  notifyCertificateReady,
};
