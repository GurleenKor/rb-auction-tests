/**
 * Single source of truth for expected values. Shared by e2e and API suites so
 * thresholds never drift between layers. Counts are *thresholds* (live data changes).
 */
export const EXPECTED = {
  directory: {
    introPattern: /over\s+60\s+permanent\s+auction\s+sites/i,
    satelliteNotePattern: /satellite\s+sites?[^.]*asterisk|asterisk[^.]*satellite/i,
    firstCountries: ['United States', 'Canada'],
    requiredCountries: ['United States', 'Canada', 'Australia', 'United Kingdom', 'Netherlands', 'UAE'],
    usSites: ['Phoenix', 'Salt Lake City', 'Houston', 'Las Vegas', 'Atlanta'],
    caSites: ['Edmonton', 'Montreal', 'Toronto', 'Regina', 'Saskatoon'],
    minUsSites: 20, // must be greater than
    minCaSites: 10,
    minSatellite: 15,
    minPermanent: 25,
    minTotal: 60,
    knownSatellite: ['San Antonio', 'Calgary'],
    knownPermanent: ['Phoenix', 'Edmonton'],
  },
  yard: {
    slug: 'edmonton-ab',
    name: 'Edmonton',
    street: '1500 Sparrow Drive',
    city: 'Nisku',
    postal: 'T9E 8H6',
    minCategories: 5,
    requiredCategory: /excavators/i,
    oneOfCategories: [/harvesting equipment/i, /agricultural tractors/i, /sprayers/i, /excavator attachments/i],
  },
  api: {
    minLocations: 60,
    minCountries: 8,
    minSatellite: 15,
    minPermanent: 25,
    searchText: 'Edmonton',
  },
} as const;
