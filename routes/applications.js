const express = require('express');
const router = express.Router();
const {
  fetchApplicationsFromSupabase,
  insertApplicationToSupabase,
  updateApplicationStatusInSupabase,
  deleteApplicationFromSupabase,
} = require('../lib/supabaseDb');
const { authenticate, requireRole, optionalAuth } = require('../middlewares/auth');
const { validateBody } = require('../middlewares/validate');
const { asyncHandler } = require('../middlewares/error');

/**
 * GET /api/applications
 * List all coach onboarding applications (sorted newest first)
 */
router.get(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { status, email } = req.query;
    let apps = (await fetchApplicationsFromSupabase()) || [];

    if (status && status !== 'all') {
      apps = apps.filter((a) => a.status === status);
    }
    if (email) {
      const cleanEmail = email.trim().toLowerCase();
      apps = apps.filter((a) => a.email && a.email.toLowerCase() === cleanEmail);
    }

    return res.status(200).json({
      success: true,
      count: apps.length,
      data: apps,
    });
  })
);

/**
 * POST /api/applications
 * Submit or update a coach onboarding application
 */
router.post(
  '/',
  validateBody(['name', 'email']),
  asyncHandler(async (req, res) => {
    const appData = req.body;
    const id = appData.id || `app-${appData.userId || Date.now()}`;

    const newApp = {
      ...appData,
      id,
      status: appData.status || 'approved',
      submittedAt: appData.submittedAt || 'Just now',
    };

    const saved = await insertApplicationToSupabase(newApp);

    return res.status(201).json({
      success: true,
      persistedToSupabase: saved,
      message: 'Coach application saved successfully',
      data: newApp,
    });
  })
);

/**
 * PATCH /api/applications/:id/status
 * Admin reviews a coach application (approved, rejected, changes_requested)
 */
router.patch(
  '/:id/status',
  authenticate,
  requireRole('admin'),
  validateBody(['status']),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const validStatuses = ['pending', 'approved', 'rejected', 'changes_requested'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        code: 'INVALID_STATUS',
      });
    }

    const updated = await updateApplicationStatusInSupabase(id, status, adminNotes);

    return res.status(200).json({
      success: updated,
      message: updated ? `Application marked as ${status}` : 'Failed to update application status in database',
      data: { id, status, adminNotes },
    });
  })
);

/**
 * DELETE /api/applications/:id
 * Remove a coach application (Admin)
 */
router.delete(
  '/:id',
  authenticate,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const deleted = await deleteApplicationFromSupabase(id);

    return res.status(200).json({
      success: deleted,
      message: deleted ? 'Application deleted successfully' : 'Failed to delete application',
    });
  })
);

module.exports = router;

