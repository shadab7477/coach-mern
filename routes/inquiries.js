const express = require('express');
const router = express.Router();
const {
  fetchInquiriesFromSupabase,
  insertInquiryToSupabase,
  updateInquiryStatusInSupabase,
  deleteInquiryFromSupabase,
  fetchCoachesFromSupabase,
} = require('../lib/supabaseDb');
const { INITIAL_COACHES } = require('../lib/coachesData');
const { authenticate, optionalAuth } = require('../middlewares/auth');
const { validateBody } = require('../middlewares/validate');
const { asyncHandler } = require('../middlewares/error');

/**
 * GET /api/inquiries
 * List inquiries (filtered by coachId or clientEmail)
 */
router.get(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { coachId, clientEmail } = req.query;
    const cleanEmail = clientEmail ? clientEmail.toLowerCase().trim() : '';

    let inquiries = (await fetchInquiriesFromSupabase()) || [];

    if (coachId) {
      inquiries = inquiries.filter((inq) => inq.coachId === coachId);
    }
    if (cleanEmail) {
      inquiries = inquiries.filter((inq) => inq.clientEmail && inq.clientEmail.toLowerCase() === cleanEmail);
    }

    return res.status(200).json({
      success: true,
      count: inquiries.length,
      data: inquiries,
    });
  })
);

/**
 * POST /api/inquiries
 * Submit a new inquiry / lead to a coach
 */
router.post(
  '/',
  validateBody(['coachId', 'clientName', 'clientEmail', 'message']),
  asyncHandler(async (req, res) => {
    const {
      coachId,
      clientName,
      clientEmail,
      clientPhone = '',
      goal = '',
      preferredTime = 'Flexible / Any time',
      message,
    } = req.body;

    const cleanEmail = clientEmail.trim().toLowerCase();
    const cleanName = clientName.trim();

    const coaches = (await fetchCoachesFromSupabase()) || INITIAL_COACHES;
    const coach = coaches.find((c) => c.id === coachId || c.slug === coachId);
    const coachName = coach ? coach.name : 'Certified Coach';

    const newInquiry = {
      id: `inq-${Date.now()}`,
      coachId,
      coachName,
      clientName: cleanName,
      clientEmail: cleanEmail,
      clientPhone: clientPhone.trim(),
      goal: goal.trim() || 'General Mentoring & Strategy',
      preferredTime: preferredTime.trim(),
      message: message.trim(),
      status: 'new',
      replyNotes: '',
      createdAt: new Date().toISOString(),
    };

    await insertInquiryToSupabase(newInquiry);

    return res.status(201).json({
      success: true,
      message: 'Inquiry sent successfully to coach',
      data: newInquiry,
    });
  })
);

/**
 * PATCH /api/inquiries/:id/status
 * Update lead status (new, contacted, qualified, converted, closed) & attach replyNotes (Protected)
 */
router.patch(
  '/:id/status',
  authenticate,
  validateBody(['status']),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, replyNotes } = req.body;

    const validStatuses = ['new', 'contacted', 'qualified', 'converted', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        code: 'INVALID_STATUS',
      });
    }

    const success = await updateInquiryStatusInSupabase(id, status, replyNotes);

    return res.status(200).json({
      success,
      message: success ? `Inquiry status updated to '${status}'.` : 'Failed to update inquiry status in database.',
    });
  })
);

/**
 * DELETE /api/inquiries/:id
 * Delete inquiry (Protected)
 */
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const success = await deleteInquiryFromSupabase(id);

    return res.status(200).json({
      success,
      message: success ? 'Inquiry deleted successfully' : 'Failed to delete inquiry from database.',
    });
  })
);

module.exports = router;
