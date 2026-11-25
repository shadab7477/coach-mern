const express = require('express');
const router = express.Router();
const {
  fetchBookingsFromSupabase,
  insertBookingToSupabase,
  updateBookingStatusInSupabase,
  deleteBookingFromSupabase,
  fetchCoachesFromSupabase,
} = require('../lib/supabaseDb');
const { generateDeterministicZoomMeeting } = require('../lib/zoomMeeting');
const { INITIAL_COACHES } = require('../lib/coachesData');
const { authenticate, optionalAuth } = require('../middlewares/auth');
const { validateBody } = require('../middlewares/validate');
const { asyncHandler } = require('../middlewares/error');

/**
 * GET /api/bookings/user
 * Get all bookings for authenticated user or query email
 */
router.get(
  '/user',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const queryEmail = req.query.email ? req.query.email.toLowerCase().trim() : '';
    const targetEmail = queryEmail || req.user?.email?.toLowerCase().trim();

    if (!targetEmail) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required or provide "?email=user@example.com" query parameter.',
        code: 'AUTH_REQUIRED',
      });
    }

    const allBookings = (await fetchBookingsFromSupabase()) || [];
    const userBookings = allBookings
      .filter((b) => b.clientEmail && b.clientEmail.toLowerCase() === targetEmail)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return res.status(200).json({
      success: true,
      message: `Found ${userBookings.length} booking(s) for ${targetEmail}`,
      data: userBookings,
    });
  })
);

/**
 * GET /api/bookings
 * Fetch bookings with optional filters: coachId, clientEmail, date, status
 */
router.get(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { coachId, clientEmail, date, status } = req.query;
    const cleanClientEmail = clientEmail ? clientEmail.toLowerCase().trim() : '';

    let bookings = (await fetchBookingsFromSupabase()) || [];

    if (coachId) {
      bookings = bookings.filter((b) => b.coachId === coachId);
    }
    if (cleanClientEmail) {
      bookings = bookings.filter((b) => b.clientEmail && b.clientEmail.toLowerCase() === cleanClientEmail);
    }
    if (date) {
      bookings = bookings.filter((b) => b.date === date);
    }
    if (status) {
      bookings = bookings.filter((b) => b.status === status);
    }

    return res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  })
);

/**
 * GET /api/bookings/:id
 * Retrieve a specific booking by ID
 */
router.get(
  '/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const allBookings = (await fetchBookingsFromSupabase()) || [];
    const booking = allBookings.find((b) => b.id === id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: `Booking with ID '${id}' not found.`,
        code: 'BOOKING_NOT_FOUND',
      });
    }

    return res.status(200).json({
      success: true,
      data: booking,
    });
  })
);

/**
 * POST /api/bookings
 * Confirm and schedule a 1:1 coaching booking with automatic Zoom generation & collision protection
 */
router.post(
  '/',
  validateBody(['coachId', 'clientName', 'clientEmail', 'date', 'timeSlot']),
  asyncHandler(async (req, res) => {
    const {
      id: customId,
      coachId,
      coachName: bodyCoachName,
      coachPhoto: bodyCoachPhoto,
      clientName,
      clientEmail,
      clientPhone,
      clientNotes,
      date,
      timeSlot,
      deliveryMode = 'Online',
      service,
      serviceTitle: bodyServiceTitle,
      servicePrice: bodyServicePrice,
      duration: bodyDuration,
      meetingLink: bodyMeetingLink,
    } = req.body;

    const cleanEmail = clientEmail.trim().toLowerCase();
    const cleanName = clientName.trim();

    // 1. Lookup Coach Details
    const coaches = (await fetchCoachesFromSupabase()) || INITIAL_COACHES;
    const coach = coaches.find((c) => c.id === coachId || c.slug === coachId);
    const coachName = bodyCoachName || (coach ? coach.name : 'Certified Coach');
    const coachPhoto = bodyCoachPhoto || (coach ? coach.photoUrl : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80');

    // 2. Collision Guard
    const existingBookings = (await fetchBookingsFromSupabase()) || [];
    const isSlotTaken = existingBookings.some(
      (b) =>
        b.coachId === coachId &&
        b.date === date &&
        b.timeSlot === timeSlot &&
        b.status !== 'cancelled'
    );

    if (isSlotTaken) {
      return res.status(409).json({
        success: false,
        error: `The slot on ${date} at ${timeSlot} is already reserved. Please select another slot.`,
        code: 'SLOT_COLLISION',
      });
    }

    // 3. Zoom Link Generation
    let meetingLink = bodyMeetingLink || '';
    const serviceTitle = bodyServiceTitle || service?.title || '1:1 Strategy Breakthrough Session';
    const servicePrice = bodyServicePrice !== undefined ? Number(bodyServicePrice) : (Number(service?.price) || coach?.startingPrice || 1500);
    const duration = bodyDuration || service?.duration || '45 mins';

    if (!meetingLink) {
      if (deliveryMode === 'Online') {
        const zoom = generateDeterministicZoomMeeting({
          coachName,
          clientName: cleanName,
          serviceTitle,
          date,
          timeSlot,
          durationMinutes: 45,
        });
        meetingLink = zoom.joinUrl;
      } else {
        meetingLink = coach?.location
          ? `In-Person Session at ${coach.location} (Studio / Private Room)`
          : 'In-Person Venue arranged upon confirmation';
      }
    }

    const newBooking = {
      id: customId || `book-${Date.now()}`,
      coachId,
      coachName,
      coachPhoto,
      serviceTitle,
      servicePrice,
      duration,
      deliveryMode,
      clientName: cleanName,
      clientEmail: cleanEmail,
      clientPhone: clientPhone || '',
      clientNotes: clientNotes || '',
      date,
      timeSlot,
      meetingLink,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };

    await insertBookingToSupabase(newBooking);

    return res.status(201).json({
      success: true,
      message: 'Booking confirmed successfully',
      data: newBooking,
    });
  })
);

/**
 * PATCH /api/bookings/:id/status
 * Update booking status (confirmed, rescheduled, completed, cancelled)
 */
router.patch(
  '/:id/status',
  authenticate,
  validateBody(['status']),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['confirmed', 'rescheduled', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        code: 'INVALID_STATUS',
      });
    }

    const success = await updateBookingStatusInSupabase(id, status);

    return res.status(200).json({
      success,
      message: success ? `Booking status updated to '${status}'.` : 'Failed to update booking status in database.',
    });
  })
);

/**
 * DELETE /api/bookings/:id
 * Cancel or delete booking
 */
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const success = await deleteBookingFromSupabase(id);

    return res.status(200).json({
      success,
      message: success ? 'Booking cancelled and removed.' : 'Failed to delete booking from database.',
    });
  })
);

module.exports = router;
