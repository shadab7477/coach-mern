const otpStore = new Map();

function generateOtpCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function cleanupExpiredOtps() {
  const now = Date.now();
  for (const [key, value] of otpStore.entries()) {
    if (now > value.expiresAt) {
      otpStore.delete(key);
    }
  }
}

function saveOtp(email, code, metadata = {}, expiryMinutes = 10) {
  const cleanEmail = email.trim().toLowerCase();
  const expiresAt = Date.now() + expiryMinutes * 60 * 1000;

  otpStore.set(cleanEmail, {
    code,
    email: cleanEmail,
    expiresAt,
    attempts: 0,
    metadata,
  });

  cleanupExpiredOtps();
}

function verifyOtp(email, code) {
  const cleanEmail = email.trim().toLowerCase();
  const record = otpStore.get(cleanEmail);

  if (!record) {
    return {
      valid: false,
      error: 'No OTP requested for this email, or it has expired. Please request a new code.',
    };
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(cleanEmail);
    return {
      valid: false,
      error: 'This verification code has expired. Please request a new code.',
    };
  }

  if (record.attempts >= 5) {
    otpStore.delete(cleanEmail);
    return {
      valid: false,
      error: 'Too many incorrect attempts. Please request a new verification code.',
    };
  }

  record.attempts += 1;

  if (record.code !== code.trim()) {
    const remaining = 5 - record.attempts;
    return {
      valid: false,
      error: `Invalid verification code. You have ${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} remaining.`,
    };
  }

  const metadata = record.metadata;
  otpStore.delete(cleanEmail);

  return {
    valid: true,
    metadata,
  };
}

module.exports = {
  generateOtpCode,
  saveOtp,
  verifyOtp,
  cleanupExpiredOtps
};

