/**
 * Attendance Controller
 * Handles attendance tracking and reports
 */

const Attendance = require('../models/Attendance.model');
const Event = require('../models/Event.model');

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

    res.json({
      success: true,
      data: {
        stats: {
          totalRegistered: event.registeredCount,
          totalAttended: attendanceCount,
          attendanceRate: event.registeredCount > 0 
            ? ((attendanceCount / event.registeredCount) * 100).toFixed(2) + '%'
            : '0%',
          seatsAvailable: event.seatLimit - event.registeredCount
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
  getEventStats
};
