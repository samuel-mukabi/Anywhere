export const BASE_LOCATIONS = [
  { name: 'Bali', country: 'Indonesia', iso: 'IDN', lon: 115.1889, lat: -8.4095, vibe: ['Beach', 'Digital Nomad'], img: 'bali.jpg' },
  { name: 'Bangkok', country: 'Thailand', iso: 'THA', lon: 100.5018, lat: 13.7563, vibe: ['City', 'Food'], img: 'bkk.jpg' },
  { name: 'Lisbon', country: 'Portugal', iso: 'PRT', lon: -9.1393, lat: 38.7223, vibe: ['City', 'Historical', 'Beach'], img: 'lisbon.jpg' },
  { name: 'Medellin', country: 'Colombia', iso: 'COL', lon: -75.5658, lat: 6.2442, vibe: ['Mountains', 'Warm', 'Digital Nomad'], img: 'med.jpg' },
  { name: 'Tbilisi', country: 'Georgia', iso: 'GEO', lon: 44.8271, lat: 41.7151, vibe: ['Historical', 'Mountains', 'Food'], img: 'tbilisi.jpg' },
  { name: 'Paris', country: 'France', iso: 'FRA', lon: 2.3522, lat: 48.8566, vibe: ['City', 'Museums', 'Historical'], img: 'paris.jpg' },
  { name: 'Kyoto', country: 'Japan', iso: 'JPN', lon: 135.7681, lat: 35.0116, vibe: ['Historical', 'Food', 'Culture'], img: 'kyoto.jpg' },
  { name: 'Cape Town', country: 'South Africa', iso: 'ZAF', lon: 18.4232, lat: -33.9249, vibe: ['Beach', 'Mountains', 'Nature'], img: 'cpt.jpg' },
  { name: 'Buenos Aires', country: 'Argentina', iso: 'ARG', lon: -58.3816, lat: -34.6037, vibe: ['City', 'Food', 'Nightlife'], img: 'ba.jpg' },
  { name: 'Prague', country: 'Czechia', iso: 'CZE', lon: 14.4378, lat: 50.0755, vibe: ['Historical', 'City', 'Nightlife'], img: 'prague.jpg' },
];

/**
 * Creates 250+ highly dynamic permutations safely mutating longitudes minimally
 * to prevent massive identical datasets natively mapping uniquely via Map constraints.
 */
export function generateMockDestinations(count: number = 250) {
  const generated: any[] = [];
  
  for (let i = 0; i < count; i++) {
    const base = BASE_LOCATIONS[i % BASE_LOCATIONS.length];
    
    // Spread coordinates slightly for uniqueness in 2Dsphere clustering (+/- 0.5 degrees)
    const offsetLon = base.lon + (Math.random() - 0.5);
    const offsetLat = base.lat + (Math.random() - 0.5);

    generated.push({
      name: i === 0 ? base.name : `${base.name} Sector ${i}`,
      country: base.country,
      iso: base.iso,
      coords: {
        type: 'Point',
        coordinates: [offsetLon, offsetLat]
      },
      vibes: [...base.vibe],
      climate: {
        // Random 3 "Best months" internally (0 to 11)
        bestMonths: [Math.floor(Math.random() * 12), Math.floor(Math.random() * 12)], 
        annualClimateScore: Math.floor(Math.random() * 50) + 50
      },
      avgCosts: {
        total: Math.floor(Math.random() * 5000) + 500, // Total trip
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
