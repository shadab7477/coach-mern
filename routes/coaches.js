const express = require('express');
const router = express.Router();
const { fetchCoachesFromSupabase, insertCoachToSupabase, deleteCoachFromSupabase, extendedCoachStore } = require('../lib/supabaseDb');
const { INITIAL_COACHES } = require('../lib/coachesData');
const { authenticate, requireRole, optionalAuth } = require('../middlewares/auth');
const { validateBody } = require('../middlewares/validate');
const { asyncHandler } = require('../middlewares/error');

/**
 * GET /api/coaches
 * Browse and filter coaches with multi-factor criteria, sorting, and pagination
 */
router.get(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const {
      category,
      q,
      country,
      language,
      deliveryMode,
      minRating = '0',
      maxPrice = '0',
      verifiedOnly,
      verified,
      sortBy = 'featured',
      page = '1',
      limit = '20',
    } = req.query;

    const query = q ? q.toLowerCase().trim() : '';
    const parsedMinRating = parseFloat(minRating) || 0;
    const parsedMaxPrice = parseFloat(maxPrice) || 0;
    const isVerifiedOnly = verifiedOnly === 'true' || verified === 'true';

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));

    let coaches = (await fetchCoachesFromSupabase()) || [];
    if (!coaches || coaches.length === 0) {
      coaches = [...INITIAL_COACHES];
    }

    // Category filter
    if (category && category !== 'All Categories' && category !== 'all') {
      const catLower = category.toLowerCase().trim();
      coaches = coaches.filter(
        (c) =>
          c.primaryCategory.toLowerCase() === catLower ||
          c.primaryCategory.toLowerCase().includes(catLower)
      );
    }

    // Keyword filter
    if (query) {
      coaches = coaches.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.headline.toLowerCase().includes(query) ||
          c.primaryCategory.toLowerCase().includes(query) ||
          (c.about && c.about.toLowerCase().includes(query)) ||
          (c.location && c.location.toLowerCase().includes(query)) ||
          (c.specialties && c.specialties.some((s) => s.toLowerCase().includes(query)))
      );
    }

    // Country filter
    if (country && country !== 'all') {
      const cLower = country.toLowerCase().trim();
      coaches = coaches.filter(
        (c) =>
          (c.location && c.location.toLowerCase().includes(cLower)) ||
          (c.country && c.country.toLowerCase().includes(cLower))
      );
    }

    // Language filter
    if (language && language !== 'all') {
      const lLower = language.toLowerCase().trim();
      coaches = coaches.filter(
        (c) => c.languages && c.languages.some((l) => l.toLowerCase().includes(lLower))
      );
    }

    // Delivery mode filter
    if (deliveryMode && deliveryMode !== 'all') {
      const dLower = deliveryMode.toLowerCase().trim();
      coaches = coaches.filter(
        (c) =>
          c.deliveryModes &&
          c.deliveryModes.some((m) => m.toLowerCase() === dLower || m.toLowerCase() === 'hybrid')
      );
    }

    // Min rating
    if (parsedMinRating > 0) {
      coaches = coaches.filter((c) => c.rating >= parsedMinRating);
    }

    // Max price
    if (parsedMaxPrice > 0) {
      coaches = coaches.filter((c) => c.startingPrice <= parsedMaxPrice);
    }

    // Verified
    if (isVerifiedOnly) {
      coaches = coaches.filter((c) => c.verified);
    }

    // Sorting
    if (sortBy === 'rating') {
      coaches.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'price-low') {
      coaches.sort((a, b) => a.startingPrice - b.startingPrice);
    } else if (sortBy === 'price-high') {
      coaches.sort((a, b) => b.startingPrice - a.startingPrice);
    } else if (sortBy === 'experience') {
      coaches.sort((a, b) => b.experienceYears - a.experienceYears);
    } else {
      coaches.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }

    const total = coaches.length;
    const startIndex = (pageNum - 1) * limitNum;
    const paginated = coaches.slice(startIndex, startIndex + limitNum);

    return res.status(200).json({
      success: true,
      data: {
        coaches: paginated,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
          hasMore: startIndex + limitNum < total,
        },
      },
    });
  })
);

/**
 * GET /api/coaches/:id
 * Fetch single coach profile by slug or ID
 */
router.get(
  '/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Coach ID or slug parameter is required.',
        code: 'PARAM_REQUIRED',
      });
    }

    const cleanId = id.trim().toLowerCase();
    let coaches = (await fetchCoachesFromSupabase()) || [];
    if (!coaches || coaches.length === 0) {
      coaches = [...INITIAL_COACHES];
    }

    let coach = coaches.find(
      (c) => c.id.toLowerCase() === cleanId || (c.slug && c.slug.toLowerCase() === cleanId)
    );

    if (!coach && extendedCoachStore) {
      coach = extendedCoachStore.get(cleanId) || extendedCoachStore.get(id);
    }

    if (!coach) {
      return res.status(404).json({
        success: false,
        error: `Coach with id or slug '${id}' not found.`,
        code: 'COACH_NOT_FOUND',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Coach profile retrieved successfully',
      data: coach,
    });
  })
);

/**
 * POST /api/coaches
 * Register or onboard a new coach profile with comprehensive multi-package, offline, media & credentials support
 */
router.post(
  '/',
  validateBody(['name', 'headline', 'primaryCategory']),
  asyncHandler(async (req, res) => {
    const {
      name,
      userId,
      id: customId,
      phone = '',
      phoneCountryCode = '+91',
      headline,
      primaryCategory,
      experienceYears = 1,
      specialties = [],
      startingPrice = 1500,
      offlinePrice,
      currency = '₹',
      currencyCode = 'INR',
      country = 'India',
      countryCode = 'IN',
      state = '',
      city = '',
      deliveryModes = ['Online'],
      meetingVenue = '',
      meetingLocation = '',
      languages = ['English'],
      location = 'India',
      timeZone = 'IST (UTC+5:30)',
      about = '',
      bio = '',
      coachingPhilosophy = '',
      targetAudience = 'Ambitious professionals and individuals seeking structured guidance.',
      photoUrl,
      coverUrl,
      audioIntroUrl,
      audioDurationSeconds = 0,
      videoIntroUrl,
      videoDurationSeconds = 0,
      education = [],
      educationList = [],
      degreeName,
      university,
      graduationYear,
      certifications = [],
      certificationsList = [],
      certificateFileName,
      certificateUrl,
      awards = [],
      awardsList = [],
      services = [],
      packageTitle,
      sessionDuration,
      availableDays,
      availableTimes,
      availableSlots = [],
      socialLinks,
      linkedinUrl,
      websiteUrl,
    } = req.body;

    const cleanName = name.trim();
    const slug = req.body.slug || cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const id = customId || (userId ? `coach-${userId}` : `coach-${Date.now()}`);

    // 1. Harmonize Education
    let finalEducationList = Array.isArray(educationList) && educationList.length > 0 ? [...educationList] : [];
    if (finalEducationList.length === 0 && (degreeName || university)) {
      finalEducationList.push({
        degree: degreeName || 'Bachelor Degree',
        institution: university || 'Recognized University',
        year: graduationYear || '',
      });
    }

    let finalEducationStrings = Array.isArray(education) && education.length > 0 ? [...education] : [];
    if (finalEducationStrings.length === 0 && finalEducationList.length > 0) {
      finalEducationStrings = finalEducationList.map(
        (e) => `${e.degree}${e.fieldOfStudy ? ` in ${e.fieldOfStudy}` : ''} - ${e.institution}${e.year ? ` (${e.year})` : ''}`
      );
    }
    if (finalEducationStrings.length === 0) {
      finalEducationStrings = ['Accredited Practitioner'];
    }

    // 2. Harmonize Certifications
    let finalCertificationsList = Array.isArray(certificationsList) && certificationsList.length > 0 ? [...certificationsList] : [];
    if (finalCertificationsList.length === 0 && (certificateFileName || certificateUrl)) {
      finalCertificationsList.push({
        name: Array.isArray(certifications) ? (certifications[0] || 'Verified Coach Credential') : (certifications || 'Verified Coach Credential'),
        issuingOrg: 'Accredited Coaching Council',
        certificateUrl: certificateUrl || '',
        certificateFileName: certificateFileName || 'verified_credential.pdf',
      });
    }

    let finalCertStrings = Array.isArray(certifications) && certifications.length > 0
      ? certifications
      : (typeof certifications === 'string' && certifications ? [certifications] : []);
    if (finalCertStrings.length === 0 && finalCertificationsList.length > 0) {
      finalCertStrings = finalCertificationsList.map(
        (c) => `${c.name} - ${c.issuingOrg}${c.year ? ` (${c.year})` : ''}`
      );
    }
    if (finalCertStrings.length === 0) {
      finalCertStrings = ['Verified CoachConnect Candidate'];
    }

    // 3. Harmonize Awards & Honors
    let finalAwardsList = Array.isArray(awardsList) ? awardsList : [];
    let finalAwardsStrings = Array.isArray(awards) && awards.length > 0 ? awards : [];
    if (finalAwardsStrings.length === 0 && finalAwardsList.length > 0) {
      finalAwardsStrings = finalAwardsList.map((a) => `${a.title} - ${a.issuer}${a.year ? ` (${a.year})` : ''}`);
    }

    // 4. Harmonize Pricing & Modes
    const numStartingPrice = Number(startingPrice) || 1500;
    const validModes = Array.isArray(deliveryModes) && deliveryModes.length > 0 ? deliveryModes : ['Online'];
    const isOfflineAvailable = validModes.some((m) => m.toLowerCase().includes('offline') || m.toLowerCase().includes('in-person'));
    const numOfflinePrice = offlinePrice !== undefined
      ? Number(offlinePrice)
      : (isOfflineAvailable ? Math.round(numStartingPrice * 1.5) : numStartingPrice);

    // 5. Harmonize Services / Packages
    let finalServices = Array.isArray(services) && services.length > 0 ? [...services] : [];
    if (finalServices.length === 0) {
      // Online Discovery Strategy Call
      finalServices.push({
        id: `srv-${id}-1`,
        title: packageTitle || '1:1 Discovery Breakthrough Call',
        duration: sessionDuration || '45 mins',
        price: numStartingPrice,
        currency,
        deliveryMode: 'Online',
        description: 'Personalized strategy session to map transformation goals, unblock obstacles, and establish an actionable transformation blueprint.',
        inclusions: ['45-minute 1:1 Zoom video session', 'Personalized action roadmap PDF', '7-day direct follow-up chat access'],
        isPopular: !isOfflineAvailable,
      });

      // In-Person Studio Consultation if offline enabled
      if (isOfflineAvailable) {
        finalServices.push({
          id: `srv-${id}-2`,
          title: 'In-Person Executive Intensive (Studio)',
          duration: '75 mins',
          price: numOfflinePrice,
          currency,
          deliveryMode: 'In-Person',
          description: `Face-to-face deep breakthrough session held at consulting suite: ${meetingVenue || meetingLocation || location || 'Consulting Studio'}.`,
          inclusions: ['75-minute in-person consultation', 'Printed diagnostic assessment kit', 'Complimentary 30-day email follow-up'],
          isPopular: true,
        });
      }
    }

    // 6. Harmonize Available Slots
    let finalSlots = Array.isArray(availableSlots) && availableSlots.length > 0 ? availableSlots : [];
    if (finalSlots.length === 0) {
      const days = Array.isArray(availableDays) && availableDays.length > 0 ? availableDays : ['Mon', 'Wed', 'Fri'];
      const times = Array.isArray(availableTimes) && availableTimes.length > 0 ? availableTimes : ['10:00 AM', '02:00 PM', '05:00 PM'];
      finalSlots = days.map((day) => ({ day, times }));
    }

    // 7. Harmonize Social Links
    const finalSocialLinks = {
      linkedin: linkedinUrl || (socialLinks && socialLinks.linkedin) || '',
      website: websiteUrl || (socialLinks && socialLinks.website) || '',
    };

    const newCoach = {
      id,
      userId: userId || null,
      slug,
      name: cleanName,
      headline: headline.trim(),
      primaryCategory,
      specialties: Array.isArray(specialties) && specialties.length > 0 ? specialties : ['Personal Growth', 'Strategy'],
      experienceYears: Number(experienceYears) || 1,
      rating: 5.0,
      reviewCount: 0,
      reviews: [],
      startingPrice: numStartingPrice,
      offlinePrice: numOfflinePrice,
      currency,
      currencyCode,
      country,
      countryCode,
      state,
      city,
      phone: phone || '',
      phoneCountryCode,
      meetingVenue,
      meetingLocation: meetingLocation || location || city,
      deliveryModes: validModes,
      languages: Array.isArray(languages) && languages.length > 0 ? languages : ['English'],
      location: location || (city ? `${city}, ${country}` : country) || 'India',
      timeZone: timeZone || 'IST (UTC+5:30)',
      verified: true,
      featured: false,
      photoUrl: photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
      coverUrl: coverUrl || 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80',
      audioIntroUrl: audioIntroUrl || '',
      audioDurationSeconds: Number(audioDurationSeconds) || 0,
      videoIntroUrl: videoIntroUrl || '',
      videoDurationSeconds: Number(videoDurationSeconds) || 0,
      about: about || bio || headline,
      coachingPhilosophy: coachingPhilosophy || 'Dedicated to empowering clients with actionable transformation and structured accountability.',
      targetAudience: targetAudience || 'Ambitious professionals and individuals seeking structured guidance.',
      education: finalEducationStrings,
      educationList: finalEducationList,
      certifications: finalCertStrings,
      certificationsList: finalCertificationsList,
      awards: finalAwardsStrings,
      awardsList: finalAwardsList,
      services: finalServices,
      availableSlots: finalSlots,
      socialLinks: finalSocialLinks,
    };

    await insertCoachToSupabase(newCoach);

    return res.status(201).json({
      success: true,
      message: 'Coach vendor profile registered successfully with comprehensive details',
      data: newCoach,
    });
  })
);

/**
 * PUT /api/coaches/:id
 * Update coach profile, offerings, or availability slots (Protected)
 */
router.put(
  '/:id',
  authenticate,
  requireRole('coach', 'admin'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const cleanId = id.trim().toLowerCase();

    const coaches = (await fetchCoachesFromSupabase()) || INITIAL_COACHES;
    const existing = coaches.find(
      (c) => c.id.toLowerCase() === cleanId || (c.slug && c.slug.toLowerCase() === cleanId)
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: `Coach with id '${id}' not found.`,
        code: 'COACH_NOT_FOUND',
      });
    }

    // Merge updates
    const updatedCoach = {
      ...existing,
      ...req.body,
      id: existing.id, // prevent modifying primary key
      slug: existing.slug,
    };

    await insertCoachToSupabase(updatedCoach);

    return res.status(200).json({
      success: true,
      message: 'Coach profile updated successfully',
      data: updatedCoach,
    });
  })
);

/**
 * DELETE /api/coaches/:id
 * Remove coach profile (Protected)
 */
router.delete(
  '/:id',
  authenticate,
  requireRole('coach', 'admin'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const success = await deleteCoachFromSupabase(id);

    return res.status(200).json({
      success,
      message: success ? 'Coach profile removed successfully' : 'Failed to delete coach from database',
    });
  })
);

module.exports = router;
