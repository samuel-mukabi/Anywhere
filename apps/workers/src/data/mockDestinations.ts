export const BASE_LOCATIONS = [
  { name: 'Reykjavik', country: 'Iceland', iso3: 'ISL', iso2: 'IS', lon: -21.9426, lat: 64.1466, vibe: ['City', 'Cold'], img: 'reykjavik.jpg' },
  { name: 'Dublin', country: 'Ireland', iso3: 'IRL', iso2: 'IE', lon: -6.2603, lat: 53.3498, vibe: ['City'], img: 'dublin.jpg' },
  { name: 'Auckland', country: 'New Zealand', iso3: 'NZL', iso2: 'NZ', lon: 174.7633, lat: -36.8485, vibe: ['City'], img: 'auckland.jpg' },
  { name: 'Singapore', country: 'Singapore', iso3: 'SGP', iso2: 'SG', lon: 103.8198, lat: 1.3521, vibe: ['City', 'Warm', 'Asia'], img: 'singapore.jpg' },
  { name: 'Lisbon', country: 'Portugal', iso3: 'PRT', iso2: 'PT', lon: -9.1393, lat: 38.7223, vibe: ['City', 'Warm'], img: 'lisbon.jpg' },
  { name: 'Zurich', country: 'Switzerland', iso3: 'CHE', iso2: 'CH', lon: 8.5417, lat: 47.3769, vibe: ['City'], img: 'zurich.jpg' },
  { name: 'Tokyo', country: 'Japan', iso3: 'JPN', iso2: 'JP', lon: 139.6503, lat: 35.6762, vibe: ['City', 'Warm', 'Asia'], img: 'tokyo.jpg' },
  { name: 'Toronto', country: 'Canada', iso3: 'CAN', iso2: 'CA', lon: -79.3470, lat: 43.6510, vibe: ['City'], img: 'toronto.jpg' },
  { name: 'Vienna', country: 'Austria', iso3: 'AUT', iso2: 'AT', lon: 16.3738, lat: 48.2082, vibe: ['City'], img: 'vienna.jpg' },
  { name: 'Berlin', country: 'Germany', iso3: 'DEU', iso2: 'DE', lon: 13.4050, lat: 52.5200, vibe: ['City'], img: 'berlin.jpg' },
  { name: 'Dubrovnik', country: 'Croatia', iso3: 'HRV', iso2: 'HR', lon: 18.0944, lat: 42.6507, vibe: ['City'], img: 'dubrovnik.jpg' },
  { name: 'Madrid', country: 'Spain', iso3: 'ESP', iso2: 'ES', lon: -3.7038, lat: 40.4168, vibe: ['City'], img: 'madrid.jpg' },
  { name: 'Rome', country: 'Italy', iso3: 'ITA', iso2: 'IT', lon: 12.4964, lat: 41.9028, vibe: ['City'], img: 'rome.jpg' },
  { name: 'London', country: 'United Kingdom', iso3: 'GBR', iso2: 'GB', lon: -0.1278, lat: 51.5074, vibe: ['City'], img: 'london.jpg' },
  { name: 'Amsterdam', country: 'Netherlands', iso3: 'NLD', iso2: 'NL', lon: 4.9041, lat: 52.3676, vibe: ['City'], img: 'amsterdam.jpg' },
  { name: 'Seoul', country: 'South Korea', iso3: 'KOR', iso2: 'KR', lon: 126.9780, lat: 37.5665, vibe: ['City', 'Warm', 'Asia'], img: 'seoul.jpg' },
  { name: 'Hanoi', country: 'Vietnam', iso3: 'VNM', iso2: 'VN', lon: 105.8542, lat: 21.0285, vibe: ['City', 'Warm', 'Asia'], img: 'hanoi.jpg' },
  { name: 'Athens', country: 'Greece', iso3: 'GRC', iso2: 'GR', lon: 23.7275, lat: 37.9838, vibe: ['City', 'Warm'], img: 'athens.jpg' },
  { name: 'Bali', country: 'Indonesia', iso3: 'IDN', iso2: 'ID', lon: 115.1889, lat: -8.4095, vibe: ['City', 'Warm', 'Asia'], img: 'bali.jpg' },
  { name: 'Buenos Aires', country: 'Argentina', iso3: 'ARG', iso2: 'AR', lon: -58.3816, lat: -34.6037, vibe: ['City'], img: 'buenos_aires.jpg' },
  { name: 'Kuala Lumpur', country: 'Malaysia', iso3: 'MYS', iso2: 'MY', lon: 101.6869, lat: 3.1390, vibe: ['City', 'Warm', 'Asia'], img: 'kuala_lumpur.jpg' },
  { name: 'Bangkok', country: 'Thailand', iso3: 'THA', iso2: 'TH', lon: 100.5018, lat: 13.7563, vibe: ['City', 'Warm', 'Asia'], img: 'bangkok.jpg' },
  { name: 'Paris', country: 'France', iso3: 'FRA', iso2: 'FR', lon: 2.3522, lat: 48.8566, vibe: ['City'], img: 'paris.jpg' },
  { name: 'Dubai', country: 'United Arab Emirates', iso3: 'ARE', iso2: 'AE', lon: 55.2708, lat: 25.2048, vibe: ['City', 'Warm', 'Asia'], img: 'dubai.jpg' },
  { name: 'Marrakech', country: 'Morocco', iso3: 'MAR', iso2: 'MA', lon: -7.9811, lat: 31.6295, vibe: ['City', 'Warm'], img: 'marrakech.jpg' },
  { name: 'Santiago', country: 'Chile', iso3: 'CHL', iso2: 'CL', lon: -70.6693, lat: -33.4489, vibe: ['City'], img: 'santiago.jpg' },
  { name: 'Cape Town', country: 'South Africa', iso3: 'ZAF', iso2: 'ZA', lon: 18.4232, lat: -33.9249, vibe: ['City'], img: 'cape_town.jpg' },
  { name: 'Lima', country: 'Peru', iso3: 'PER', iso2: 'PE', lon: -77.0428, lat: -12.0464, vibe: ['City', 'Warm'], img: 'lima.jpg' },
  { name: 'Istanbul', country: 'Turkey', iso3: 'TUR', iso2: 'TR', lon: 28.9784, lat: 41.0082, vibe: ['City'], img: 'istanbul.jpg' },
  { name: 'Nairobi', country: 'Kenya', iso3: 'KEN', iso2: 'KE', lon: 36.8219, lat: -1.2921, vibe: ['City', 'Warm'], img: 'nairobi.jpg' },
  { name: 'Cairo', country: 'Egypt', iso3: 'EGY', iso2: 'EG', lon: 31.2357, lat: 30.0444, vibe: ['City', 'Warm'], img: 'cairo.jpg' },
  { name: 'Rio de Janeiro', country: 'Brazil', iso3: 'BRA', iso2: 'BR', lon: -43.1729, lat: -22.9068, vibe: ['City', 'Warm'], img: 'rio_de_janeiro.jpg' },
  { name: 'New York', country: 'United States', iso3: 'USA', iso2: 'US', lon: -74.0060, lat: 40.7128, vibe: ['City'], img: 'new_york.jpg' },
  { name: 'Mexico City', country: 'Mexico', iso3: 'MEX', iso2: 'MX', lon: -99.1332, lat: 19.4326, vibe: ['City', 'Warm'], img: 'mexico_city.jpg' },
  { name: 'Bogota', country: 'Colombia', iso3: 'COL', iso2: 'CO', lon: -74.0721, lat: 4.7110, vibe: ['City', 'Warm'], img: 'bogota.jpg' },
  { name: 'Oslo', country: 'Norway', iso3: 'NOR', iso2: 'NO', lon: 10.7522, lat: 59.9139, vibe: ['City', 'Cold'], img: 'oslo.jpg' },
  { name: 'Budapest', country: 'Hungary', iso3: 'HUN', iso2: 'HU', lon: 19.0402, lat: 47.4979, vibe: ['City'], img: 'budapest.jpg' },
  { name: 'Taipei', country: 'Taiwan', iso3: 'TWN', iso2: 'TW', lon: 121.5654, lat: 25.0330, vibe: ['City', 'Warm', 'Asia'], img: 'taipei.jpg' },
  { name: 'Sydney', country: 'Australia', iso3: 'AUS', iso2: 'AU', lon: 151.2093, lat: -33.8688, vibe: ['City'], img: 'sydney.jpg' },
  { name: 'Tallinn', country: 'Estonia', iso3: 'EST', iso2: 'EE', lon: 24.7536, lat: 59.4370, vibe: ['City', 'Cold'], img: 'tallinn.jpg' },
  { name: 'Stockholm', country: 'Sweden', iso3: 'SWE', iso2: 'SE', lon: 18.0686, lat: 59.3293, vibe: ['City', 'Cold'], img: 'stockholm.jpg' },
  { name: 'San Jose', country: 'Costa Rica', iso3: 'CRI', iso2: 'CR', lon: -84.0907, lat: 9.9281, vibe: ['City', 'Warm'], img: 'san_jose.jpg' },
  { name: 'Montevideo', country: 'Uruguay', iso3: 'URY', iso2: 'UY', lon: -56.1645, lat: -34.9011, vibe: ['City'], img: 'montevideo.jpg' },
  { name: 'Sofia', country: 'Bulgaria', iso3: 'BGR', iso2: 'BG', lon: 23.3219, lat: 42.6977, vibe: ['City'], img: 'sofia.jpg' },
  { name: 'Dakar', country: 'Senegal', iso3: 'SEN', iso2: 'SN', lon: -17.4467, lat: 14.6928, vibe: ['City', 'Warm'], img: 'dakar.jpg' },
  { name: 'Belgrade', country: 'Serbia', iso3: 'SRB', iso2: 'RS', lon: 20.4612, lat: 44.8125, vibe: ['City'], img: 'belgrade.jpg' },
  { name: 'Accra', country: 'Ghana', iso3: 'GHA', iso2: 'GH', lon: -0.1870, lat: 5.6037, vibe: ['City', 'Warm'], img: 'accra.jpg' },
  { name: 'Dar es Salaam', country: 'Tanzania', iso3: 'TZA', iso2: 'TZ', lon: 39.2083, lat: -6.7924, vibe: ['City', 'Warm'], img: 'dar_es_salaam.jpg' },
  { name: 'Kigali', country: 'Rwanda', iso3: 'RWA', iso2: 'RW', lon: 30.0588, lat: -1.9403, vibe: ['City', 'Warm'], img: 'kigali.jpg' },
  { name: 'Yerevan', country: 'Armenia', iso3: 'ARM', iso2: 'AM', lon: 44.5152, lat: 40.1872, vibe: ['City'], img: 'yerevan.jpg' },
  { name: 'Panama City', country: 'Panama', iso3: 'PAN', iso2: 'PA', lon: -79.5199, lat: 8.9824, vibe: ['City', 'Warm'], img: 'panama_city.jpg' },
  { name: 'La Paz', country: 'Bolivia', iso3: 'BOL', iso2: 'BO', lon: -68.1193, lat: -16.4897, vibe: ['City'], img: 'la_paz.jpg' },
  { name: 'Amman', country: 'Jordan', iso3: 'JOR', iso2: 'JO', lon: 35.9284, lat: 31.9454, vibe: ['City', 'Warm'], img: 'amman.jpg' },
  { name: 'Tbilisi', country: 'Georgia', iso3: 'GEO', iso2: 'GE', lon: 44.8271, lat: 41.7151, vibe: ['City'], img: 'tbilisi.jpg' },
  { name: 'Quito', country: 'Ecuador', iso3: 'ECU', iso2: 'EC', lon: -78.4678, lat: -0.1807, vibe: ['City', 'Warm'], img: 'quito.jpg' },
  { name: 'Kingston', country: 'Jamaica', iso3: 'JAM', iso2: 'JM', lon: -76.8099, lat: 18.0179, vibe: ['City', 'Warm'], img: 'kingston.jpg' },
  { name: 'Guatemala City', country: 'Guatemala', iso3: 'GTM', iso2: 'GT', lon: -90.5069, lat: 14.6349, vibe: ['City', 'Warm'], img: 'guatemala_city.jpg' },
  { name: 'Havana', country: 'Cuba', iso3: 'CUB', iso2: 'CU', lon: -82.3666, lat: 23.1136, vibe: ['City', 'Warm'], img: 'havana.jpg' },
  { name: 'New Delhi', country: 'India', iso3: 'IND', iso2: 'IN', lon: 77.2090, lat: 28.6139, vibe: ['City', 'Warm', 'Asia'], img: 'new_delhi.jpg' },
  { name: 'Moscow', country: 'Russia', iso3: 'RUS', iso2: 'RU', lon: 37.6173, lat: 55.7558, vibe: ['City', 'Cold'], img: 'moscow.jpg' },
  { name: 'Kyiv', country: 'Ukraine', iso3: 'UKR', iso2: 'UA', lon: 30.5234, lat: 50.4501, vibe: ['City', 'Cold'], img: 'kyiv.jpg' },
  { name: 'Manila', country: 'Philippines', iso3: 'PHL', iso2: 'PH', lon: 120.9842, lat: 14.5995, vibe: ['City', 'Warm', 'Asia'], img: 'manila.jpg' },
  { name: 'Islamabad', country: 'Pakistan', iso3: 'PAK', iso2: 'PK', lon: 73.0479, lat: 33.6844, vibe: ['City', 'Warm', 'Asia'], img: 'islamabad.jpg' },
  { name: 'Tehran', country: 'Iran', iso3: 'IRN', iso2: 'IR', lon: 51.3890, lat: 35.6892, vibe: ['City', 'Warm', 'Asia'], img: 'tehran.jpg' },
  { name: 'Jerusalem', country: 'Israel', iso3: 'ISR', iso2: 'IL', lon: 35.2137, lat: 31.7683, vibe: ['City', 'Warm'], img: 'jerusalem.jpg' },
  { name: 'Addis Ababa', country: 'Ethiopia', iso3: 'ETH', iso2: 'ET', lon: 38.7636, lat: 9.0054, vibe: ['City', 'Warm'], img: 'addis_ababa.jpg' },
  { name: 'Suva', country: 'Fiji', iso3: 'FJI', iso2: 'FJ', lon: 178.4501, lat: -18.1248, vibe: ['City', 'Warm', 'Beach'], img: 'suva.jpg' },
  { name: 'Apia', country: 'Samoa', iso3: 'WSM', iso2: 'WS', lon: -171.7341, lat: -13.8405, vibe: ['City', 'Warm', 'Beach'], img: 'apia.jpg' },
  { name: 'Male', country: 'Maldives', iso3: 'MDV', iso2: 'MV', lon: 73.5093, lat: 4.1755, vibe: ['City', 'Warm', 'Beach'], img: 'male.jpg' },
  { name: 'Belize City', country: 'Belize', iso3: 'BLZ', iso2: 'BZ', lon: -88.1976, lat: 17.4995, vibe: ['City', 'Warm'], img: 'belize_city.jpg' },
  { name: 'Bridgetown', country: 'Barbados', iso3: 'BRB', iso2: 'BB', lon: -59.5988, lat: 13.1132, vibe: ['City', 'Warm'], img: 'bridgetown.jpg' },
  { name: 'Victoria', country: 'Seychelles', iso3: 'SYC', iso2: 'SC', lon: 55.4513, lat: -4.6191, vibe: ['City', 'Warm'], img: 'victoria.jpg' },
  { name: 'Roseau', country: 'Dominica', iso3: 'DMA', iso2: 'DM', lon: -61.3887, lat: 15.3015, vibe: ['City', 'Warm'], img: 'roseau.jpg' },
  { name: 'Kabul', country: 'Afghanistan', iso3: 'AFG', iso2: 'AF', lon: 69.1723, lat: 34.5281, vibe: ['City', 'Warm', 'Asia'], img: 'kabul.jpg' }
];

/**
 * Creates 250+ highly dynamic permutations safely mutating longitudes minimally
 * to prevent massive identical datasets natively mapping uniquely via Map constraints.
 */
interface MockSeedDestination {
  name: string;
  country: string;
  iso: string;
  coords: { type: 'Point'; coordinates: number[] };
  vibes: string[];
  climate: { bestMonths: number[]; annualClimateScore: number };
  avgCosts: { total: number; flightEst: number; dailyLiving: number };
  imageUrl: string;
  hiddenGemScore: number;
  updatedAt: Date;
}

export function generateMockDestinations(count: number = 250): MockSeedDestination[] {
  const generated: MockSeedDestination[] = [];
  
  for (let i = 0; i < count; i++) {
    const base = BASE_LOCATIONS[i % BASE_LOCATIONS.length];
    
    // Slight coordinate offset for uniqueness (+/- 0.5 degrees)
    const offsetLon = base.lon + (Math.random() - 0.5);
    const offsetLat = base.lat + (Math.random() - 0.5);
    
    generated.push({
      name: base.name, // use real city name for GeoDB lookup
      country: base.country,
      iso: base.iso2,   // use ISO‑2 code required by GeoDB
      coords: {
        type: 'Point',
        coordinates: [offsetLon, offsetLat]
      },
      vibes: [...base.vibe],
      climate: {
        bestMonths: [Math.floor(Math.random() * 12), Math.floor(Math.random() * 12)],
        annualClimateScore: Math.floor(Math.random() * 50) + 50
      },
      avgCosts: {
        total: Math.floor(Math.random() * 5000) + 500,
        flightEst: Math.floor(Math.random() * 1500) + 200,
        dailyLiving: Math.floor(Math.random() * 150) + 30
      },
      imageUrl: `https://mock.com/${base.img}`,
      hiddenGemScore: Math.floor(Math.random() * 100),
      updatedAt: new Date()
    });
  }
  
  return generated;
}
