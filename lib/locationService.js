const { Country, State, City } = require('country-state-city');

const POPULAR_CURRENCIES = {
  INR: { symbol: '₹', name: 'Indian Rupee', flag: 'IN', badge: 'IN' },
  USD: { symbol: '$', name: 'US Dollar', flag: 'US', badge: 'US' },
  EUR: { symbol: '€', name: 'Euro', flag: 'EU', badge: 'EU' },
  GBP: { symbol: '£', name: 'British Pound', flag: 'GB', badge: 'GB' },
  AED: { symbol: 'AED', name: 'UAE Dirham', flag: 'AE', badge: 'AE' },
  AUD: { symbol: 'A$', name: 'Australian Dollar', flag: 'AU', badge: 'AU' },
  CAD: { symbol: 'C$', name: 'Canadian Dollar', flag: 'CA', badge: 'CA' },
  SGD: { symbol: 'S$', name: 'Singapore Dollar', flag: 'SG', badge: 'SG' },
};

function getCurrencySymbol(currencyCode) {
  const code = (currencyCode || '').toUpperCase().trim();
  if (POPULAR_CURRENCIES[code]) {
    return POPULAR_CURRENCIES[code].symbol;
  }
  if (code === 'INR') return '₹';
  if (code === 'USD') return '$';
  if (code === 'EUR') return '€';
  if (code === 'GBP') return '£';
  if (code === 'AED') return 'AED';
  if (code === 'AUD') return 'A$';
  if (code === 'CAD') return 'C$';
  return code || '$';
}

function getAllCountries() {
  return Country.getAllCountries().map((c) => {
    const rawPhone = c.phonecode.startsWith('+') ? c.phonecode : `+${c.phonecode}`;
    return {
      name: c.name,
      isoCode: c.isoCode,
      flag: c.isoCode,
      badge: c.isoCode,
      phonecode: rawPhone,
      phoneCode: rawPhone,
      currency: c.currency,
      currencySymbol: getCurrencySymbol(c.currency),
    };
  });
}

function getStatesOfCountry(countryCode) {
  if (!countryCode) return [];
  return State.getStatesOfCountry(countryCode).map((s) => ({
    name: s.name,
    isoCode: s.isoCode,
    countryCode: s.countryCode,
  }));
}

function getCitiesOfState(countryCode, stateCode) {
  if (!countryCode) return [];
  if (stateCode) {
    return (City.getCitiesOfState(countryCode, stateCode) || []).map((c) => ({
      name: c.name,
      stateCode: c.stateCode,
      countryCode: c.countryCode,
    }));
  }
  return (City.getCitiesOfCountry(countryCode) || []).map((c) => ({
    name: c.name,
    stateCode: c.stateCode,
    countryCode: c.countryCode,
  }));
}

module.exports = {
  getAllCountries,
  getStatesOfCountry,
  getCitiesOfState,
  getCurrencySymbol,
  POPULAR_CURRENCIES
};

