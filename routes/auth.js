const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { generateOtpCode, saveOtp, verifyOtp } = require('../lib/otpStore');
const { sendOtpEmail } = require('../lib/mailer');
const { signToken } = require('../lib/jwt');
const { authenticate } = require('../middlewares/auth');
const { authLimiter } = require('../middlewares/rateLimiter');
const { validateBody } = require('../middlewares/validate');
const { asyncHandler } = require('../middlewares/error');
const { fetchCoachesFromSupabase, upsertProfileToSupabase, fetchProfileByEmail } = require('../lib/supabaseDb');

/**
 * Derives a stable, deterministic user ID from an email address.
 * Same email → always same ID. No randomness or timestamps used.
 */
function deriveUserId(email) {
  const hash = crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
  return `usr-${hash.slice(0, 24)}`;
}

/**
 * POST /api/auth/send-otp
 * Dispatches 6-digit OTP to user's email with rate limiting
 */
router.post(
  '/send-otp',
  authLimiter,
  validateBody(['email']),
  asyncHandler(async (req, res) => {
    const { email, purpose = 'verify', fullName, role = 'client', password } = req.body;

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid email address.',
        code: 'INVALID_EMAIL',
      });
    }

    const otpCode = generateOtpCode();

    saveOtp(cleanEmail, otpCode, {
      fullName,
      role,
      purpose,
      password,
    });

    const emailRes = await sendOtpEmail(cleanEmail, otpCode, purpose, fullName);

    if (!emailRes.success) {
      return res.status(500).json({
        success: false,
        error: emailRes.error || 'Failed to dispatch OTP email. Please verify SMTP credentials.',
        code: 'EMAIL_SEND_FAILED',
      });
    }

    const isDev = process.env.NODE_ENV !== 'production';
    return res.status(200).json({
      success: true,
      message: `A 6-digit verification code has been dispatched to ${cleanEmail}.`,
      data: {
        email: cleanEmail,
        purpose,
      },
      previewOtp: isDev ? otpCode : undefined,
    });
  })
);

/**
 * POST /api/auth/verify-otp
 * Validates OTP code and issues a secure signed JWT token
 */
router.post(
  '/verify-otp',
  authLimiter,
  validateBody(['email', 'otp']),
  asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = String(otp).trim();

    const result = verifyOtp(cleanEmail, cleanOtp);

    if (!result.valid) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Invalid or expired OTP code.',
        code: 'OTP_INVALID',
      });
    }

    const meta = result.metadata || {};
    let userRole = meta.role || (cleanEmail.includes('admin') ? 'admin' : 'client');
    let userFullName = meta.fullName || cleanEmail.split('@')[0];
    let coachId = null;

    // ── Step 1: Check if an existing profile already exists for this email ──────
    // This is the idempotency gate: same email always gets the same account.
    const existingProfile = await fetchProfileByEmail(cleanEmail);

    // ── Step 2: Derive a stable, deterministic userId from email ─────────────────
    // Using sha256(email) means the same email ALWAYS produces the same userId.
    // Previously used `usr-${Date.now()}` which created a NEW id on every verify.
    const userId = existingProfile?.id || deriveUserId(cleanEmail);

    if (existingProfile) {
      // Respect the stored role / name so returning users don't get downgraded
      userRole = existingProfile.role || userRole;
      userFullName = existingProfile.full_name || userFullName;
    }

    // ── Step 3: Check if user is a registered coach ──────────────────────────────
    const coaches = (await fetchCoachesFromSupabase()) || [];
    const matchedCoach = coaches.find(
      (c) =>
        (c.email && c.email.toLowerCase() === cleanEmail) ||
        (c.userId && c.userId === userId)
    );

    if (matchedCoach) {
      userRole = 'coach';
      userFullName = matchedCoach.name || userFullName;
      coachId = matchedCoach.id;
    }

    // ── Step 4: Persist / update profile (upsert on email = idempotent) ──────────
    await upsertProfileToSupabase({
      id: userId,
      email: cleanEmail,
      full_name: userFullName,
      role: userRole,
    });

    // Payload for JWT
    const tokenPayload = {
      id: userId,
      email: cleanEmail,
      role: userRole,
      fullName: userFullName,
      phone: meta.phone || matchedCoach?.phone || '',
      avatarUrl: matchedCoach?.photoUrl || existingProfile?.avatar_url || '',
      coachId: coachId || undefined,
    };

    // Sign proper standard JWT
    const sessionToken = signToken(tokenPayload, { expiresIn: '7d' });

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully!',
      verified: true,
      token: sessionToken,
      data: {
        user: tokenPayload,
        token: sessionToken,
      },
      user: tokenPayload,
      metadata: result.metadata,
    });
  })
);

/**
 * POST /api/auth/login
 * Password-based login (including Platform Admin) issuing a real signed JWT token
 */
router.post(
  '/login',
  authLimiter,
  validateBody(['email', 'password']),
  asyncHandler(async (req, res) => {
    const cleanEmail = req.body.email.trim().toLowerCase();
    const { password } = req.body;

    if (cleanEmail === 'admin@coachconnect.org' && password === 'CoachAdmin@2026') {
      const adminPayload = {
        id: 'admin-master',
        email: 'admin@coachconnect.org',
        fullName: 'Platform Administrator',
        role: 'admin',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
      };
      const token = signToken(adminPayload);
      return res.status(200).json({
        success: true,
        message: 'Admin authenticated successfully',
        data: { user: adminPayload, token },
        user: adminPayload,
        token,
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Invalid email or password.',
      code: 'INVALID_CREDENTIALS',
    });
  })
);

/**
 * GET /api/auth/me
 * Protected endpoint to fetch current authenticated user profile
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    return res.status(200).json({
      success: true,
      message: 'User session verified successfully',
      data: {
        user: req.user,
        authenticated: true,
      },
    });
  })
);

module.exports = router;
