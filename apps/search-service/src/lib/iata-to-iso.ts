/**
 * Maps IATA city/airport codes to ISO 3166-1 alpha-2 country codes.
 * Used to reconcile TravelPayouts responses (IATA) with Destination documents (ISO alpha-2).
 */
export const IATA_TO_ISO: Record<string, string> = {
  // United Kingdom
  LON: 'GB', LHR: 'GB', LGW: 'GB', STN: 'GB', EDI: 'GB', GLA: 'GB', MAN: 'GB',
  // France
  PAR: 'FR', CDG: 'FR', ORY: 'FR', NCE: 'FR', LYS: 'FR', MRS: 'FR',
  // Germany
  BER: 'DE', FRA: 'DE', MUC: 'DE', DUS: 'DE', HAM: 'DE', CGN: 'DE',
  // Spain
  MAD: 'ES', BCN: 'ES', AGP: 'ES', PMI: 'ES', VLC: 'ES', SVQ: 'ES', IBZ: 'ES',
  // Italy
  ROM: 'IT', FCO: 'IT', MXP: 'IT', VCE: 'IT', NAP: 'IT', FCE: 'IT', BRI: 'IT', CTA: 'IT',
  // Portugal
  LIS: 'PT', OPO: 'PT', FAO: 'PT',
  // Netherlands
  AMS: 'NL',
  // Greece
  ATH: 'GR', HER: 'GR', SKG: 'GR', RHO: 'GR', KGS: 'GR', CFU: 'GR',
  // Turkey
  IST: 'TR', AYT: 'TR', ADB: 'TR', ESB: 'TR',
  // Croatia
  ZAG: 'HR', DBV: 'HR', SPU: 'HR',
  // Czech Republic
  PRG: 'CZ',
  // Hungary
  BUD: 'HU',
  // Poland
  WAW: 'PL', KRK: 'PL',
  // Austria
  VIE: 'AT', SZG: 'AT',
  // Switzerland
  ZRH: 'CH', GVA: 'CH', BSL: 'CH',
  // Belgium
  BRU: 'BE',
  // Ireland
  DUB: 'IE', ORK: 'IE',
  // Sweden
  STO: 'SE', ARN: 'SE', GOT: 'SE',
  // Norway
  OSL: 'NO', BGO: 'NO',
  // Denmark
  CPH: 'DK',
  // Finland
  HEL: 'FI',
  // Iceland
  REY: 'IS', KEF: 'IS',
  // Japan
  TYO: 'JP', NRT: 'JP', HND: 'JP', OSA: 'JP', KIX: 'JP', NGO: 'JP', FUK: 'JP',
  // Thailand
  BKK: 'TH', HKT: 'TH', CNX: 'TH', KBV: 'TH',
  // Indonesia
  DPS: 'ID', JKT: 'ID', CGK: 'ID',
  // Singapore
  SIN: 'SG',
  // Vietnam
  HAN: 'VN', SGN: 'VN', DAD: 'VN',
  // Malaysia
  KUL: 'MY', PEN: 'MY', BKI: 'MY',
  // Philippines
  MNL: 'PH', CEB: 'PH',
  // Cambodia
  PNH: 'KH', REP: 'KH',
  // UAE
  DXB: 'AE', AUH: 'AE', SHJ: 'AE',
  // India
  DEL: 'IN', BOM: 'IN', BLR: 'IN', MAA: 'IN', CCU: 'IN', HYD: 'IN',
  // Hong Kong
  HKG: 'HK',
  // South Korea
  SEL: 'KR', ICN: 'KR', GMP: 'KR',
  // Taiwan
  TPE: 'TW', TSA: 'TW',
  // Sri Lanka
  CMB: 'LK',
  // Nepal
  KTM: 'NP',
  // Maldives
  MLE: 'MV',
  // USA
  NYC: 'US', JFK: 'US', LAX: 'US', ORD: 'US', MIA: 'US', SFO: 'US', LAS: 'US',
  DFW: 'US', ATL: 'US', SEA: 'US', DEN: 'US', BOS: 'US', MSY: 'US', HNL: 'US',
  // Canada
  YYZ: 'CA', YVR: 'CA', YUL: 'CA', YYC: 'CA', YEG: 'CA',
  // Mexico
  MEX: 'MX', CUN: 'MX', GDL: 'MX', MTY: 'MX',
  // Brazil
  GRU: 'BR', GIG: 'BR', SSA: 'BR', REC: 'BR', FOR: 'BR',
  // Argentina
  EZE: 'AR', BUE: 'AR', COR: 'AR',
  // Colombia
  BOG: 'CO', MDE: 'CO', CTG: 'CO',
  // Peru
  LIM: 'PE',
  // Chile
  SCL: 'CL',
  // Ecuador
  UIO: 'EC', GYE: 'EC',
  // Bolivia
  LPB: 'BO',
  // Costa Rica
  SJO: 'CR',
  // Panama
  PTY: 'PA',
  // Dominican Republic
  SDQ: 'DO', PUJ: 'DO',
  // Jamaica
  KIN: 'JM', MBJ: 'JM',
  // Cuba
  HAV: 'CU',
  // New Zealand
  AKL: 'NZ', CHC: 'NZ', WLG: 'NZ',
  // Australia
  SYD: 'AU', MEL: 'AU', BNE: 'AU', PER: 'AU', ADL: 'AU', CNS: 'AU',
  // South Africa
  JNB: 'ZA', CPT: 'ZA', DUR: 'ZA',
  // Kenya
  NBO: 'KE', MBA: 'KE',
  // Tanzania
  DAR: 'TZ', ZNZ: 'TZ', JRO: 'TZ',
  // Morocco
  CMN: 'MA', RAK: 'MA', AGA: 'MA', TNG: 'MA',
  // Egypt
  CAI: 'EG', HRG: 'EG', SSH: 'EG', LXR: 'EG',
  // Ethiopia
  ADD: 'ET',
  // Ghana
  ACC: 'GH',
  // Nigeria
  LOS: 'NG', ABV: 'NG',
  // Israel
  TLV: 'IL',
  // Jordan
  AMM: 'JO', AQJ: 'JO',
  // Georgia (country)
  TBS: 'GE',
  // Armenia
  EVN: 'AM',
  // Azerbaijan
  GYD: 'AZ',
  // Uzbekistan
  TAS: 'UZ', SKD: 'UZ',
  // Russia
  MOW: 'RU', SVO: 'RU', LED: 'RU',
  // Ukraine
  KBP: 'UA', IEV: 'UA',
  // Romania
  OTP: 'RO', CLJ: 'RO',
  // Bulgaria
  SOF: 'BG', VAR: 'BG',
  // Serbia
  BEG: 'RS',
  // Slovenia
  LJU: 'SI',
  // Albania
  TIA: 'AL',
  // North Macedonia
  SKP: 'MK',
  // Montenegro
  TGD: 'ME', TIV: 'ME',
  // Bosnia and Herzegovina
  SJJ: 'BA',
  // Slovakia
  BTS: 'SK',
  // Latvia
  RIX: 'LV',
  // Lithuania
  VNO: 'LT',
  // Estonia
  TLL: 'EE',
  // Luxembourg
  LUX: 'LU',
  // Malta
  MLA: 'MT',
  // Cyprus
  LCA: 'CY', PFO: 'CY',
};

/** Map a TravelPayouts IATA city/airport code to an ISO alpha-2 country code, or null if unknown. */
export function iataToIso(iata: string): string | null {
  return IATA_TO_ISO[iata.toUpperCase()] ?? null;
}
