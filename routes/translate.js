const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middlewares/error');

const translationCache = new Map();

async function translateSingleText(text, targetLang, sourceLang = 'auto') {
  const trimmed = (text || '').trim();
  if (!trimmed) return '';
  if (targetLang === 'en' && (sourceLang === 'en' || !sourceLang)) return trimmed;

  const cacheKey = `${sourceLang || 'auto'}->${targetLang}:${trimmed}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sourceLang)}&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(trimmed)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Google Translate responded with HTTP ${response.status}`);
    }

    const data = await response.json();
    let translated = '';
    if (Array.isArray(data) && Array.isArray(data[0])) {
      translated = data[0].map((segment) => segment[0] || '').join('');
    }

    const result = translated || trimmed;
    translationCache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.warn(`[Translate] Failed for "${trimmed}":`, err.message);
    return trimmed;
  }
}

/**
 * GET /api/translate
 * Translate single text string via query parameters (?text=...&to=...)
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { text, to = 'en', from = 'auto' } = req.query;
    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text query parameter is required.',
        code: 'PARAM_REQUIRED',
      });
    }

    const translated = await translateSingleText(text, to, from);
    return res.status(200).json({
      success: true,
      translation: translated,
      targetLang: to,
    });
  })
);

/**
 * POST /api/translate
 * Translate single text or batch array of texts
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { text, texts, targetLang, sourceLang = 'auto' } = req.body;

    if (!targetLang) {
      return res.status(400).json({
        success: false,
        error: 'Field "targetLang" is required.',
        code: 'PARAM_REQUIRED',
      });
    }

    if (typeof text === 'string') {
      const translated = await translateSingleText(text, targetLang, sourceLang);
      return res.status(200).json({
        success: true,
        translation: translated,
        targetLang,
      });
    }

    if (Array.isArray(texts)) {
      const translations = await Promise.all(
        texts.map((t) => translateSingleText(t, targetLang, sourceLang))
      );
      return res.status(200).json({
        success: true,
        translations,
        targetLang,
      });
    }

    return res.status(400).json({
      success: false,
      error: 'Either "text" or "texts" array must be provided.',
      code: 'PARAM_REQUIRED',
    });
  })
);

module.exports = router;
