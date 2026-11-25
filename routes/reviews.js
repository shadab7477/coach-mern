const express = require('express');
const router = express.Router();
const { fetchCoachesFromSupabase, insertCoachToSupabase } = require('../lib/supabaseDb');
const { INITIAL_COACHES } = require('../lib/coachesData');
const { validateBody } = require('../middlewares/validate');
const { asyncHandler } = require('../middlewares/error');

// In-memory store for newly posted client testimonials
const memoryReviews = new Map();

/**
 * GET /api/reviews
 * Fetch all ratings and reviews for a specific coach
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const coachId = req.query.coachId ? req.query.coachId.toLowerCase().trim() : '';

    if (!coachId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query parameter "?coachId=..."',
        code: 'PARAM_REQUIRED',
      });
    }

    const coaches = (await fetchCoachesFromSupabase()) || INITIAL_COACHES;
    const coach = coaches.find((c) => c.id.toLowerCase() === coachId || (c.slug && c.slug.toLowerCase() === coachId));

    if (!coach) {
      return res.status(404).json({
        success: false,
        error: `Coach with id '${coachId}' not found.`,
        code: 'COACH_NOT_FOUND',
      });
    }

    const coachReviews = memoryReviews.get(coach.id) || coach.reviews || [];

    return res.status(200).json({
      success: true,
      data: {
        coachId: coach.id,
        coachName: coach.name,
        rating: coach.rating,
        reviewCount: coach.reviewCount || coachReviews.length,
        reviews: coachReviews,
      },
    });
  })
);

/**
 * POST /api/reviews
 * Submit client testimonial and automatically recalculate coach's rating
 */
router.post(
  '/',
  validateBody(['coachId', 'clientName', 'rating', 'comment']),
  asyncHandler(async (req, res) => {
    const {
      coachId,
      clientName,
      clientEmail,
      rating,
      comment,
      sessionType = '1:1 Coaching Strategy Session',
    } = req.body;

    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be a numeric value between 1 and 5.',
        code: 'INVALID_RATING',
      });
    }

    const coaches = (await fetchCoachesFromSupabase()) || INITIAL_COACHES;
    const coachIndex = coaches.findIndex((c) => c.id === coachId || (c.slug && c.slug === coachId));

    if (coachIndex === -1) {
      return res.status(404).json({
        success: false,
        error: `Coach with id '${coachId}' not found.`,
        code: 'COACH_NOT_FOUND',
      });
    }

    const coach = coaches[coachIndex];

    const newReview = {
      id: `rev-${Date.now()}`,
      clientName: clientName.trim(),
      clientAvatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(clientName.trim())}`,
      rating: Math.round(numRating),
      date: 'Today',
      sessionType: sessionType.trim(),
      comment: comment.trim(),
    };

    const currentReviews = coach.reviews || [];
    const updatedReviews = [newReview, ...currentReviews];
    const newReviewCount = updatedReviews.length;
    const newAverageRating = parseFloat(
      (updatedReviews.reduce((sum, r) => sum + r.rating, 0) / newReviewCount).toFixed(1)
    );

    const updatedCoach = {
      ...coach,
      rating: newAverageRating,
      reviewCount: newReviewCount,
      reviews: updatedReviews,
    };

    memoryReviews.set(coach.id, updatedReviews);
    await insertCoachToSupabase(updatedCoach);

    return res.status(201).json({
      success: true,
      message: 'Review submitted and coach rating updated successfully',
      data: {
        review: newReview,
        newRating: newAverageRating,
        reviewCount: newReviewCount,
      },
    });
  })
);

module.exports = router;
