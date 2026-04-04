/**
 * Attendance Controller
 * Handles attendance tracking and reports
 */

const Attendance = require('../models/Attendance.model');
const Event = require('../models/Event.model');
const Certificate = require('../models/Certificate.model');
const certificateService = require('../services/certificateService');

/**
 * @route   GET /api/attendance/event/:eventId
 * @desc    Get attendance list for an event
 * @access  Private (Organizer only)
 */
const getEventAttendance = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    // Verify event exists and user is the organizer
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    if (event.organizerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view attendance for this event'
      });
    }

    const attendance = await Attendance.find({ eventId })
      .populate('userId', 'name email rollNumber department')
      .populate('verifiedBy', 'name')
      .sort({ entryTime: 1 });

    res.json({
      success: true,
      count: attendance.length,
      data: {
        event: {
          title: event.title,
          date: event.date,
          registeredCount: event.registeredCount
        },
        attendance
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/attendance/my-attendance
 * @desc    Get attendance history for current user
 * @access  Private
 */
const getMyAttendance = async (req, res, next) => {
  try {
    const attendance = await Attendance.find({ userId: req.user._id })
      .populate('eventId', 'title date venue')
      .sort({ entryTime: -1 });

    res.json({
      success: true,
      count: attendance.length,
      data: { attendance }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/attendance/event/:eventId/stats
 * @desc    Get attendance statistics for an event
 * @access  Private (Organizer only)
 */
const getEventStats = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    if (event.organizerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const attendanceCount = await Attendance.countDocuments({ eventId });
    const certificateStats = await certificateService.getCertificateStats(eventId);
    const noShowCount = Math.max(0, event.registeredCount - attendanceCount);
    const attendanceRateValue = event.registeredCount > 0
      ? (attendanceCount / event.registeredCount) * 100
      : 0;
    const certificateIssuedCount = certificateStats.totalCertificates;
    const certificateCoverageValue = attendanceCount > 0
      ? (certificateIssuedCount / attendanceCount) * 100
      : 0;

    let performanceSummary = 'Low attendance so far';
    if (attendanceRateValue >= 85) {
      performanceSummary = 'Excellent turnout';
    } else if (attendanceRateValue >= 60) {
      performanceSummary = 'Healthy turnout';
    } else if (attendanceRateValue >= 30) {
      performanceSummary = 'Moderate turnout';
    }

    res.json({
      success: true,
      data: {
        stats: {
          totalRegistered: event.registeredCount,
          totalAttended: attendanceCount,
          attendanceRate: `${attendanceRateValue.toFixed(2)}%`,
          seatsAvailable: event.seatLimit - event.registeredCount,
          noShowCount,
          certificateIssuedCount,
          certificatePendingCount: certificateStats.pendingCertificates,
          certificateCoverageRate: `${certificateCoverageValue.toFixed(2)}%`,
          performanceSummary
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/attendance/organizer/summary
 * @desc    Get cross-event analytics summary for the logged-in organizer
 * @access  Private (Organizer only)
 */
const getOrganizerSummary = async (req, res, next) => {
  try {
    const organizerId = req.user._id;
    const events = await Event.find({ organizerId }).select(
      '_id title status date registeredCount seatLimit enableCertificates department eventType'
    );

    if (events.length === 0) {
      return res.json({
        success: true,
        data: {
          summary: {
            totalEvents: 0,
            totalRegistrations: 0,
            totalAttendance: 0,
            totalNoShows: 0,
            overallAttendanceRate: '0.00%',
            certificatesIssued: 0,
            certificateCoverageRate: '0.00%',
            performanceSummary: 'Create your first event to start tracking performance.',
            eventSummaries: [],
            topPerformer: null,
            needsAttention: null,
          }
        }
      });
    }

    const eventIds = events.map((event) => event._id);
    const [attendanceAgg, certificateAgg] = await Promise.all([
      Attendance.aggregate([
        { $match: { eventId: { $in: eventIds } } },
        { $group: { _id: '$eventId', totalAttended: { $sum: 1 } } }
      ]),
      Certificate.aggregate([
        { $match: { eventId: { $in: eventIds } } },
        { $group: { _id: '$eventId', totalCertificates: { $sum: 1 } } }
      ])
    ]);

    const attendanceMap = new Map(attendanceAgg.map((row) => [row._id.toString(), row.totalAttended]));
    const certificateMap = new Map(certificateAgg.map((row) => [row._id.toString(), row.totalCertificates]));

    let totalRegistrations = 0;
    let totalAttendance = 0;
    let totalNoShows = 0;
    let certificatesIssued = 0;

    const eventSummaries = events.map((event) => {
      const eventId = event._id.toString();
      const attended = attendanceMap.get(eventId) || 0;
      const issuedCertificates = certificateMap.get(eventId) || 0;
      const noShows = Math.max(0, event.registeredCount - attended);
      const attendanceRateValue = event.registeredCount > 0 ? (attended / event.registeredCount) * 100 : 0;

      totalRegistrations += event.registeredCount;
      totalAttendance += attended;
      totalNoShows += noShows;
      certificatesIssued += issuedCertificates;

      return {
        eventId,
        title: event.title,
        status: event.status,
        date: event.date,
        department: event.department,
        eventType: event.eventType,
        registeredCount: event.registeredCount,
        attendedCount: attended,
        noShowCount: noShows,
        attendanceRate: `${attendanceRateValue.toFixed(2)}%`,
        certificateIssuedCount: issuedCertificates,
        enableCertificates: event.enableCertificates,
      };
    });

    const overallAttendanceRateValue = totalRegistrations > 0 ? (totalAttendance / totalRegistrations) * 100 : 0;
    const certificateCoverageRateValue = totalAttendance > 0 ? (certificatesIssued / totalAttendance) * 100 : 0;

    const sortedByAttendance = [...eventSummaries].sort((a, b) => parseFloat(b.attendanceRate) - parseFloat(a.attendanceRate));
    const topPerformer = sortedByAttendance[0] || null;
    const needsAttention = [...sortedByAttendance].reverse().find((event) => event.registeredCount > 0) || null;

    let performanceSummary = 'Moderate organizer performance across events.';
    if (overallAttendanceRateValue >= 85) {
      performanceSummary = 'Excellent organizer performance with strong turnout across events.';
    } else if (overallAttendanceRateValue >= 60) {
      performanceSummary = 'Healthy turnout across most events.';
    } else if (overallAttendanceRateValue < 30 && totalRegistrations > 0) {
      performanceSummary = 'Several events need attention due to low attendee conversion.';
    }

    res.json({
      success: true,
      data: {
        summary: {
          totalEvents: events.length,
          totalRegistrations,
          totalAttendance,
          totalNoShows,
          overallAttendanceRate: `${overallAttendanceRateValue.toFixed(2)}%`,
          certificatesIssued,
          certificateCoverageRate: `${certificateCoverageRateValue.toFixed(2)}%`,
          performanceSummary,
          eventSummaries,
          topPerformer,
          needsAttention,
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEventAttendance,
  getMyAttendance,
  getEventStats,
  getOrganizerSummary
};
