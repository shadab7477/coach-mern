const fs = require('fs');
const path = require('path');
const { supabase } = require('./supabase');

const DATA_DIR = path.join(__dirname, '..', 'data');
const EXTENDED_COACHES_FILE = path.join(DATA_DIR, 'extended-coaches.json');
const EXTENDED_APPS_FILE = path.join(DATA_DIR, 'extended-applications.json');

// Persistent Disk + In-Memory Store for rich media (audio, video), structured education, certifications, awards, and packages
const extendedCoachStore = new Map();
const extendedAppStore = new Map();

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn('[DiskStore] Failed to create data dir:', err.message);
  }
}

function loadStoreFromDisk(filePath, targetMap) {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const obj = JSON.parse(raw);
      if (obj && typeof obj === 'object') {
        Object.entries(obj).forEach(([k, v]) => targetMap.set(k, v));
      }
    }
  } catch (err) {
    console.warn(`[DiskStore] Could not load ${filePath}:`, err.message);
  }
}

function saveStoreToDisk(filePath, sourceMap) {
  try {
    ensureDataDir();
    const obj = {};
    for (const [k, v] of sourceMap.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), 'utf8');
  } catch (err) {
    console.warn(`[DiskStore] Could not save ${filePath}:`, err.message);
  }
}

// Hydrate stores on startup
loadStoreFromDisk(EXTENDED_COACHES_FILE, extendedCoachStore);
loadStoreFromDisk(EXTENDED_APPS_FILE, extendedAppStore);

async function fetchCoachesFromSupabase() {
  try {
    const { data, error } = await supabase.from('coaches').select('*');
    if (error || !data || data.length === 0) {
      return null;
    }

    return data.map((row) => {
      const extra = extendedCoachStore.get(row.id) || extendedCoachStore.get(row.slug) || {};
      return {
        id: row.id,
        userId: row.user_id || extra.userId,
        slug: row.slug || extra.slug || row.id,
        name: row.name,
        headline: row.headline || extra.headline || '',
        primaryCategory: row.primary_category || extra.primaryCategory || 'Life Coach',
        specialties: row.specialties || extra.specialties || [],
        experienceYears: row.experience_years || extra.experienceYears || 5,
        rating: Number(row.rating) || extra.rating || 5.0,
        reviewCount: row.review_count || extra.reviewCount || 1,
        startingPrice: row.starting_price || extra.startingPrice || 1500,
        offlinePrice: extra.offlinePrice || (row.starting_price ? Math.round(row.starting_price * 1.5) : 2500),
        currency: row.currency || extra.currency || '₹',
        currencyCode: extra.currencyCode || 'INR',
        country: extra.country || 'India',
        countryCode: extra.countryCode || 'IN',
        state: extra.state || '',
        city: extra.city || '',
        phone: extra.phone || '',
        phoneCountryCode: extra.phoneCountryCode || '+91',
        meetingVenue: extra.meetingVenue || '',
        meetingLocation: extra.meetingLocation || row.location || '',
        deliveryModes: row.delivery_modes || extra.deliveryModes || ['Online'],
        languages: row.languages || extra.languages || ['English'],
        location: row.location || extra.location || 'India',
        timeZone: extra.timeZone || 'IST (UTC+5:30)',
        verified: Boolean(row.verified !== undefined ? row.verified : extra.verified),
        featured: Boolean(row.featured !== undefined ? row.featured : extra.featured),
        photoUrl: row.photo_url || extra.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
        coverUrl: row.cover_url || extra.coverUrl || 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80',
        audioIntroUrl: extra.audioIntroUrl || '',
        audioDurationSeconds: extra.audioDurationSeconds || 0,
        videoIntroUrl: extra.videoIntroUrl || '',
        videoDurationSeconds: extra.videoDurationSeconds || 0,
        about: row.about || extra.about || '',
        coachingPhilosophy: row.coaching_philosophy || extra.coachingPhilosophy || '',
        targetAudience: extra.targetAudience || 'Individuals seeking transformation and structured guidance.',
        education: extra.education && extra.education.length > 0 ? extra.education : ['Certified Practitioner'],
        educationList: extra.educationList || [],
        certifications: extra.certifications && extra.certifications.length > 0 ? extra.certifications : ['Accredited Coach'],
        certificationsList: extra.certificationsList || [],
        awards: extra.awards || [],
        awardsList: extra.awardsList || [],
        services: extra.services && extra.services.length > 0 ? extra.services : [
          {
            id: `srv-${row.id}-1`,
            title: '1:1 Discovery & Strategy Session',
            duration: '45 mins',
            price: row.starting_price || 1500,
            currency: row.currency || '₹',
            deliveryMode: 'Online',
            description: 'Deep dive into your personal goals, obstacles, and breakthrough roadmap.',
            inclusions: ['45-minute video call', 'Action plan document', 'Follow-up notes']
          }
        ],
        availableSlots: extra.availableSlots && extra.availableSlots.length > 0 ? extra.availableSlots : [
          { day: 'Mon', times: ['10:00 AM', '03:00 PM'] },
          { day: 'Wed', times: ['11:00 AM', '04:00 PM'] },
          { day: 'Fri', times: ['02:00 PM', '06:00 PM'] }
        ],
        socialLinks: extra.socialLinks || { linkedin: '', website: '' },
        ebooks: extra.ebooks || [],
        reviews: extra.reviews || [],
      };
    });
  } catch (err) {
    return null;
  }
}

async function insertCoachToSupabase(coach) {
  try {
    extendedCoachStore.set(coach.id, coach);
    if (coach.slug) {
      extendedCoachStore.set(coach.slug, coach);
    }
    saveStoreToDisk(EXTENDED_COACHES_FILE, extendedCoachStore);

    const payload = {
      id: coach.id,
      user_id: coach.userId || null,
      name: coach.name,
      slug: coach.slug || coach.id,
      headline: coach.headline || '',
      primary_category: coach.primaryCategory || 'Life Coach',
      specialties: Array.isArray(coach.specialties) ? coach.specialties : [],
      experience_years: Number(coach.experienceYears) || 1,
      rating: Number(coach.rating) || 5.0,
      review_count: Number(coach.reviewCount) || 0,
      starting_price: Number(coach.startingPrice) || 1500,
      currency: coach.currency || '₹',
      delivery_modes: Array.isArray(coach.deliveryModes) ? coach.deliveryModes : ['Online'],
      languages: Array.isArray(coach.languages) ? coach.languages : ['English'],
      location: coach.location || 'India',
      verified: Boolean(coach.verified),
      featured: Boolean(coach.featured),
      photo_url: coach.photoUrl || null,
      cover_url: coach.coverUrl || null,
      about: coach.about || '',
      coaching_philosophy: coach.coachingPhilosophy || ''
    };

    let { error } = await supabase.from('coaches').upsert(payload, { onConflict: 'id' });
    if (error && error.code === '23505') {
      // Duplicate slug constraint — append unique suffix and retry
      const uniqueSlug = `${payload.slug}-${String(coach.id).slice(-5).replace(/[^a-z0-9]/gi, '')}-${Date.now().toString().slice(-3)}`;
      payload.slug = uniqueSlug;
      coach.slug = uniqueSlug;
      extendedCoachStore.set(coach.id, coach);
      saveStoreToDisk(EXTENDED_COACHES_FILE, extendedCoachStore);
      const retry = await supabase.from('coaches').upsert(payload, { onConflict: 'id' });
      error = retry.error;
    }

    if (error) {
      console.error('[Supabase insertCoach Error]:', error.message || error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase insertCoach Exception]:', err.message || err);
    return false;
  }
}

async function deleteCoachFromSupabase(coachId) {
  try {
    const existing = extendedCoachStore.get(coachId);
    if (existing && existing.slug) {
      extendedCoachStore.delete(existing.slug);
    }
    extendedCoachStore.delete(coachId);
    saveStoreToDisk(EXTENDED_COACHES_FILE, extendedCoachStore);
    const { error } = await supabase.from('coaches').delete().eq('id', coachId);
    if (error) {
      console.error('[Supabase deleteCoach Error]:', error.message || error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase deleteCoach Exception]:', err.message || err);
    return false;
  }
}

async function fetchBookingsFromSupabase() {
  try {
    const { data, error } = await supabase.from('bookings').select('*');
    if (error || !data) return null;

    return data.map((row) => ({
      id: row.id,
      coachId: row.coach_id,
      coachName: row.coach_name,
      coachPhoto: row.coach_photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
      serviceTitle: row.service_title || '1:1 Coaching Call',
      servicePrice: row.service_price || 1500,
      duration: row.duration || '45 mins',
      deliveryMode: row.delivery_mode || 'Online',
      clientName: row.client_name,
      clientEmail: row.client_email,
      clientPhone: row.client_phone || '',
      clientNotes: row.client_notes || '',
      date: row.date,
      timeSlot: row.time_slot,
      meetingLink: row.meeting_link || 'https://us05web.zoom.us/j/84920491823?pwd=cch2026',
      status: row.status || 'confirmed',
      createdAt: row.created_at || 'Recently'
    }));
  } catch {
    return null;
  }
}

async function insertBookingToSupabase(booking) {
  try {
    const payload = {
      id: booking.id,
      coach_id: booking.coachId,
      coach_name: booking.coachName || 'Certified Coach',
      coach_photo: booking.coachPhoto || '',
      service_title: booking.serviceTitle || '1:1 Coaching Session',
      service_price: Number(booking.servicePrice) || 1500,
      duration: booking.duration || '45 mins',
      delivery_mode: booking.deliveryMode || 'Online',
      client_name: booking.clientName,
      client_email: booking.clientEmail,
      client_notes: booking.clientNotes || '',
      date: booking.date,
      time_slot: booking.timeSlot,
      meeting_link: booking.meetingLink || '',
      status: booking.status || 'confirmed'
    };

    const { error } = await supabase.from('bookings').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.error('[Supabase insertBooking Error]:', error.message || error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase insertBooking Exception]:', err.message || err);
    return false;
  }
}

async function updateBookingStatusInSupabase(bookingId, status) {
  try {
    const { error } = await supabase.from('bookings').update({ status }).eq('id', bookingId);
    return !error;
  } catch {
    return false;
  }
}

async function deleteBookingFromSupabase(bookingId) {
  try {
    const { error } = await supabase.from('bookings').delete().eq('id', bookingId);
    return !error;
  } catch {
    return false;
  }
}

async function fetchInquiriesFromSupabase() {
  try {
    const { data, error } = await supabase.from('inquiries').select('*');
    if (error || !data) return null;

    return data.map((row) => ({
      id: row.id,
      coachId: row.coach_id,
      coachName: row.coach_name,
      clientName: row.client_name,
      clientEmail: row.client_email,
      clientPhone: row.client_phone || '',
      goal: row.goal || '',
      preferredTime: row.preferred_time || '',
      message: row.message || '',
      status: row.status || 'new',
      replyNotes: row.reply_notes || '',
      createdAt: row.created_at || 'Recently'
    }));
  } catch {
    return null;
  }
}

async function insertInquiryToSupabase(inquiry) {
  try {
    const payload = {
      id: inquiry.id,
      coach_id: inquiry.coachId,
      coach_name: inquiry.coachName || 'Certified Coach',
      client_name: inquiry.clientName,
      client_email: inquiry.clientEmail,
      client_phone: inquiry.clientPhone || null,
      goal: inquiry.goal || '',
      preferred_time: inquiry.preferredTime || '',
      message: inquiry.message || '',
      status: inquiry.status || 'new'
    };

    const { error } = await supabase.from('inquiries').upsert(payload, { onConflict: 'id' });
    if (error) console.error('[Supabase insertInquiry Error]:', error.message || error);
    return !error;
  } catch (err) {
    console.error('[Supabase insertInquiry Exception]:', err.message || err);
    return false;
  }
}

async function updateInquiryStatusInSupabase(inquiryId, status, replyNotes) {
  try {
    const updatePayload = { status };
    if (replyNotes !== undefined) updatePayload.reply_notes = replyNotes;
    const { error } = await supabase.from('inquiries').update(updatePayload).eq('id', inquiryId);
    return !error;
  } catch {
    return false;
  }
}

async function deleteInquiryFromSupabase(inquiryId) {
  try {
    const { error } = await supabase.from('inquiries').delete().eq('id', inquiryId);
    return !error;
  } catch {
    return false;
  }
}

// =========================================================================
// COACH APPLICATIONS CRUD (Supabase + Disk Store for extended fields)
// =========================================================================

async function fetchApplicationsFromSupabase() {
  try {
    const { data, error } = await supabase.from('coach_applications').select('*').order('created_at', { ascending: false });
    if (error || !data) return null;

    return data.map((row) => {
      const extra = extendedAppStore.get(row.id) || {};
      return {
        ...extra,
        id: row.id,
        userId: row.user_id || extra.userId,
        name: row.name,
        email: row.email || '',
        phone: row.phone || '',
        headline: row.headline || '',
        category: row.category || 'Life Coach',
        specialties: row.specialties || extra.specialties || [],
        experienceYears: row.experience_years || extra.experienceYears || 1,
        startingPrice: Number(row.starting_price) || extra.startingPrice || 1500,
        location: row.location || extra.location || 'India',
        languages: row.languages || extra.languages || ['English'],
        bio: row.bio || extra.bio || '',
        coachingPhilosophy: row.coaching_philosophy || extra.coachingPhilosophy || '',
        photoUrl: row.photo_url || extra.photoUrl || '',
        degreeName: row.degree_name || extra.degreeName || '',
        certifications: row.certifications || extra.certifications || '',
        certificateFileName: row.certificate_file_name || extra.certificateFileName || 'certificate.pdf',
        submittedAt: row.submitted_at || extra.submittedAt || 'Recently',
        status: row.status || 'pending',
        adminNotes: row.admin_notes || ''
      };
    });
  } catch {
    return null;
  }
}

async function insertApplicationToSupabase(app) {
  try {
    extendedAppStore.set(app.id, app);
    saveStoreToDisk(EXTENDED_APPS_FILE, extendedAppStore);

    const payload = {
      id: app.id,
      user_id: app.userId || null,
      name: app.name,
      email: app.email || '',
      phone: app.phone || '',
      headline: app.headline || '',
      category: app.category || 'Life Coach',
      specialties: Array.isArray(app.specialties) ? app.specialties : [],
      experience_years: Number(app.experienceYears) || 1,
      starting_price: Number(app.startingPrice) || 1500,
      location: app.location || 'India',
      languages: Array.isArray(app.languages) ? app.languages : ['English'],
      bio: app.bio || '',
      coaching_philosophy: app.coachingPhilosophy || '',
      photo_url: app.photoUrl || '',
      degree_name: app.degreeName || '',
      certifications: Array.isArray(app.certifications) ? app.certifications.join(', ') : (app.certifications || ''),
      certificate_file_name: app.certificateFileName || 'certificate.pdf',
      submitted_at: app.submittedAt || 'Just now',
      status: app.status || 'pending',
      admin_notes: app.adminNotes || ''
    };

    const { error } = await supabase.from('coach_applications').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.error('[Supabase insertApplication Error]:', error.message || error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase insertApplication Exception]:', err.message || err);
    return false;
  }
}

async function updateApplicationStatusInSupabase(appId, status, adminNotes) {
  try {
    const existing = extendedAppStore.get(appId);
    if (existing) {
      existing.status = status;
      if (adminNotes !== undefined) existing.adminNotes = adminNotes;
      extendedAppStore.set(appId, existing);
      saveStoreToDisk(EXTENDED_APPS_FILE, extendedAppStore);
    }

    const updatePayload = { status };
    if (adminNotes !== undefined) updatePayload.admin_notes = adminNotes;
    const { error } = await supabase.from('coach_applications').update(updatePayload).eq('id', appId);
    if (error) console.error('[Supabase updateApplication Error]:', error.message || error);
    return !error;
  } catch {
    return false;
  }
}

async function deleteApplicationFromSupabase(appId) {
  try {
    extendedAppStore.delete(appId);
    saveStoreToDisk(EXTENDED_APPS_FILE, extendedAppStore);
    const { error } = await supabase.from('coach_applications').delete().eq('id', appId);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Upsert a user profile keyed on email.
 * Uses onConflict:'email' so the SAME email always maps to the SAME row.
 * If the profiles table has no unique constraint on email, falls back to
 * id-based upsert (which is still idempotent because id is now deterministic).
 */
async function upsertProfileToSupabase({ id, email, full_name, role }) {
  try {
    // Try email-conflict upsert first (requires UNIQUE constraint on email column)
    const { error: emailErr } = await supabase
      .from('profiles')
      .upsert({ id, email, full_name, role }, { onConflict: 'email', ignoreDuplicates: false });

    if (!emailErr) return { id, email, full_name, role };

    // Fallback: upsert on primary key (id is deterministic from sha256(email))
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id, email, full_name, role }, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('[Supabase upsertProfile Error]:', error.message || error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('[Supabase upsertProfile Exception]:', err.message);
    return null;
  }
}

/**
 * Look up an existing profile by email.
 * Returns the profile row or null if not found.
 */
async function fetchProfileByEmail(email) {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (error) {
      console.warn('[Supabase fetchProfileByEmail Warning]:', error.message || error);
      return null;
    }
    return data || null;
  } catch (err) {
    console.warn('[Supabase fetchProfileByEmail Exception]:', err.message);
    return null;
  }
}

module.exports = {
  extendedCoachStore,
  extendedAppStore,
  fetchCoachesFromSupabase,
  insertCoachToSupabase,
  deleteCoachFromSupabase,
  fetchBookingsFromSupabase,
  insertBookingToSupabase,
  updateBookingStatusInSupabase,
  deleteBookingFromSupabase,
  fetchInquiriesFromSupabase,
  insertInquiryToSupabase,
  updateInquiryStatusInSupabase,
  deleteInquiryFromSupabase,
  fetchApplicationsFromSupabase,
  insertApplicationToSupabase,
  updateApplicationStatusInSupabase,
  deleteApplicationFromSupabase,
  upsertProfileToSupabase,
  fetchProfileByEmail,
};
