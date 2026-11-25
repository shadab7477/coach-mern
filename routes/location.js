const express = require('express');
const router = express.Router();
const { getAllCountries, getStatesOfCountry, getCitiesOfState } = require('../lib/locationService');
const { asyncHandler } = require('../middlewares/error');

/**
 * GET /api/location/countries
 * List all 250 countries with ISO code, phone code, and currency symbol
 */
router.get(
  '/countries',
  asyncHandler(async (req, res) => {
    const countries = getAllCountries();
    return res.status(200).json({
      success: true,
      count: countries.length,
      data: countries,
    });
  })
);

/**
 * GET /api/location/states
 * List all states belonging to countryCode (e.g. IN, US, GB)
 */
router.get(
  '/states',
  asyncHandler(async (req, res) => {
    const countryCode = req.query.countryCode || req.query.country || '';
    if (!countryCode) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "countryCode" is required (e.g., IN, US).',
        code: 'PARAM_REQUIRED',
      });
    }

    const states = getStatesOfCountry(countryCode.toUpperCase().trim());
    return res.status(200).json({
      success: true,
      countryCode: countryCode.toUpperCase().trim(),
      count: states.length,
      data: states,
    });
  })
);

/**
 * GET /api/location/cities
 * List all cities belonging to countryCode and optional stateCode
 */
router.get(
  '/cities',
  asyncHandler(async (req, res) => {
    const countryCode = req.query.countryCode || req.query.country || '';
    const stateCode = req.query.stateCode || req.query.state || undefined;

    if (!countryCode) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "countryCode" is required.',
        code: 'PARAM_REQUIRED',
      });
    }

    const cities = getCitiesOfState(
      countryCode.toUpperCase().trim(),
      stateCode ? stateCode.toUpperCase().trim() : undefined
    );

    return res.status(200).json({
      success: true,
      countryCode: countryCode.toUpperCase().trim(),
      stateCode: stateCode ? stateCode.toUpperCase().trim() : null,
      count: cities.length,
      data: cities,
    });
  })
);

module.exports = router;
