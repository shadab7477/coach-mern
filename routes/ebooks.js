const fs = require('fs');
const path = require('path');
const express = require('express');
const router = express.Router();
const { fetchCoachesFromSupabase, insertCoachToSupabase } = require('../lib/supabaseDb');
const { INITIAL_COACHES } = require('../lib/coachesData');
const { authenticate, requireRole, optionalAuth } = require('../middlewares/auth');
const { validateBody } = require('../middlewares/validate');
const { asyncHandler } = require('../middlewares/error');

const EBOOKS_FILE = path.join(__dirname, '..', 'data', 'ebooks.json');
const memoryEbooks = new Map();

function loadEbooksFromDisk() {
  try {
    if (fs.existsSync(EBOOKS_FILE)) {
      const obj = JSON.parse(fs.readFileSync(EBOOKS_FILE, 'utf8'));
      if (obj && typeof obj === 'object') {
        Object.entries(obj).forEach(([k, v]) => memoryEbooks.set(k, v));
      }
    }
  } catch (err) {
    console.warn('[EbooksStore] Load failed:', err.message);
  }
}

function saveEbooksToDisk() {
  try {
    const dir = path.dirname(EBOOKS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const obj = {};
    for (const [k, v] of memoryEbooks.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(EBOOKS_FILE, JSON.stringify(obj, null, 2), 'utf8');
  } catch (err) {
    console.warn('[EbooksStore] Save failed:', err.message);
  }
}

loadEbooksFromDisk();

/**
 * GET /api/ebooks
 * List e-books with category, query search, freeOnly, and coachId filters
 */
router.get(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { category, q, freeOnly, coachId } = req.query;
    const catQuery = category ? category.toLowerCase().trim() : '';
    const textQuery = q ? q.toLowerCase().trim() : '';
    const isFreeOnly = freeOnly === 'true';

    const coaches = (await fetchCoachesFromSupabase()) || INITIAL_COACHES;
    const allEbooks = [...Array.from(memoryEbooks.values())];

    coaches.forEach((coach) => {
      if (coach.ebooks && Array.isArray(coach.ebooks)) {
        coach.ebooks.forEach((eb) => {
          allEbooks.push({
            ...eb,
            coachName: eb.coachName || coach.name,
            coachPhoto: eb.coachPhoto || coach.photoUrl,
          });
        });
      }
    });

    let filtered = allEbooks;

    if (coachId) {
      filtered = filtered.filter((eb) => eb.coachId === coachId);
    }
    if (catQuery && catQuery !== 'all') {
      filtered = filtered.filter((eb) => (eb.category || '').toLowerCase().includes(catQuery));
    }
    if (textQuery) {
      filtered = filtered.filter(
        (eb) =>
          eb.title.toLowerCase().includes(textQuery) ||
          (eb.subtitle && eb.subtitle.toLowerCase().includes(textQuery)) ||
          (eb.description && eb.description.toLowerCase().includes(textQuery)) ||
          (eb.coachName && eb.coachName.toLowerCase().includes(textQuery)) ||
          (eb.topics && eb.topics.some((t) => t.toLowerCase().includes(textQuery)))
      );
    }
    if (isFreeOnly) {
      filtered = filtered.filter((eb) => eb.price === 0);
    }

    return res.status(200).json({
      success: true,
      data: {
        count: filtered.length,
        ebooks: filtered,
      },
    });
  })
);

/**
 * POST /api/ebooks
 * Purchase or unlock an e-book
 */
router.post(
  '/',
  validateBody(['ebookId', 'userEmail']),
  asyncHandler(async (req, res) => {
    const { ebookId, userEmail, userName } = req.body;
    const cleanEmail = userEmail.trim().toLowerCase();
    const coaches = (await fetchCoachesFromSupabase()) || INITIAL_COACHES;

    let targetEbook = memoryEbooks.get(ebookId) || null;
    if (!targetEbook) {
      for (const coach of coaches) {
        if (coach.ebooks && Array.isArray(coach.ebooks)) {
          const found = coach.ebooks.find((eb) => eb.id === ebookId);
          if (found) {
            targetEbook = {
              ...found,
              coachName: found.coachName || coach.name,
              coachPhoto: found.coachPhoto || coach.photoUrl,
            };
            break;
          }
        }
      }
    }

    if (!targetEbook) {
      return res.status(404).json({
        success: false,
        error: `E-book with id '${ebookId}' not found.`,
        code: 'EBOOK_NOT_FOUND',
      });
    }

    const orderId = `eb-ord-${Date.now()}`;
    const orderData = {
      orderId,
      ebookId: targetEbook.id,
      title: targetEbook.title,
      coachName: targetEbook.coachName,
      userEmail: cleanEmail,
      userName: userName || cleanEmail.split('@')[0],
      price: targetEbook.price,
      currency: targetEbook.currency || '₹',
      pdfUrl: targetEbook.pdfUrl,
      pdfFileName: targetEbook.pdfFileName || `${targetEbook.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
      downloadUrl: targetEbook.pdfUrl,
      purchasedAt: new Date().toISOString(),
      status: 'completed',
    };

    return res.status(201).json({
      success: true,
      message: 'E-book unlocked successfully',
      data: orderData,
    });
  })
);

/**
 * POST /api/ebooks/publish
 * Coach publishes a new digital product / e-book (Protected)
 */
router.post(
  '/publish',
  authenticate,
  requireRole('coach', 'admin'),
  validateBody(['coachId', 'title', 'price', 'pdfUrl']),
  asyncHandler(async (req, res) => {
    const {
      id: customId,
      coachId,
      title,
      subtitle,
      description,
      price,
      currency = '₹',
      coverImageUrl,
      pdfUrl,
      pdfFileName,
      pdfFileSize,
      pageCount,
      category,
      topics = [],
    } = req.body;

    const coaches = (await fetchCoachesFromSupabase()) || INITIAL_COACHES;
    const coachIndex = coaches.findIndex((c) => c.id === coachId || c.slug === coachId);

    if (coachIndex === -1) {
      return res.status(404).json({
        success: false,
        error: `Coach with id '${coachId}' not found.`,
        code: 'COACH_NOT_FOUND',
      });
    }

    const coach = coaches[coachIndex];
    const newEbook = {
      id: customId || `eb-${Date.now()}`,
      coachId: coach.id,
      coachName: coach.name,
      coachPhoto: coach.photoUrl,
      title: title.trim(),
      subtitle: subtitle || '',
      description: description || '',
      price: Number(price) || 0,
      currency,
      coverImageUrl: coverImageUrl || coach.photoUrl,
      pdfUrl,
      pdfFileName: pdfFileName || `${title.trim().replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
      pdfFileSize: pdfFileSize || '2.4 MB',
      pageCount: Number(pageCount) || 25,
      category: category || coach.primaryCategory,
      topics: Array.isArray(topics) ? topics : [category || coach.primaryCategory],
      downloadsCount: 0,
      rating: 5.0,
      isPublished: true,
      createdAt: new Date().toISOString(),
    };

    const currentEbooks = coach.ebooks || [];
    coach.ebooks = [newEbook, ...currentEbooks.filter((e) => e.id !== newEbook.id)];
    memoryEbooks.set(newEbook.id, newEbook);
    saveEbooksToDisk();

    await insertCoachToSupabase(coach);

    return res.status(201).json({
      success: true,
      message: 'E-book published successfully',
      data: newEbook,
    });
  })
);

/**
 * PUT /api/ebooks/:id
 * Update a published e-book
 */
router.put(
  '/:id',
  authenticate,
  requireRole('coach', 'admin'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const existing = memoryEbooks.get(id) || {};
    const updated = { ...existing, ...req.body, id };
    memoryEbooks.set(id, updated);
    saveEbooksToDisk();

    if (updated.coachId) {
      const coaches = (await fetchCoachesFromSupabase()) || INITIAL_COACHES;
      const coach = coaches.find((c) => c.id === updated.coachId);
      if (coach) {
        coach.ebooks = (coach.ebooks || []).map((e) => (e.id === id ? updated : e));
        await insertCoachToSupabase(coach);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'E-book updated successfully',
      data: updated,
    });
  })
);

/**
 * DELETE /api/ebooks/:id
 * Delete a published e-book
 */
router.delete(
  '/:id',
  authenticate,
  requireRole('coach', 'admin'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const existing = memoryEbooks.get(id);
    memoryEbooks.delete(id);
    saveEbooksToDisk();

    const coaches = (await fetchCoachesFromSupabase()) || INITIAL_COACHES;
    const targetCoach = existing?.coachId
      ? coaches.find((c) => c.id === existing.coachId)
      : coaches.find((c) => (c.ebooks || []).some((e) => e.id === id));

    if (targetCoach) {
      targetCoach.ebooks = (targetCoach.ebooks || []).filter((e) => e.id !== id);
      await insertCoachToSupabase(targetCoach);
    }

    return res.status(200).json({
      success: true,
      message: 'E-book deleted successfully',
    });
  })
);

module.exports = router;
