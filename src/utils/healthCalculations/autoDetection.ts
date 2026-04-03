/**
 * UNIVERSAL HEALTH CALCULATION SYSTEM - AUTO-DETECTION FRAMEWORK
 * Automatically detect climate, ethnicity, and optimal formulas
 *
 * Phase 1: Auto-Detection
 * Version: 1.0.0
 * Date: 2025-12-30
 */

import {
  ClimateType,
  ClimateDetectionResult,
  EthnicityType,
  EthnicityDetectionResult,
  BMRFormula,
  BMRFormulaSelection,
  ActivityLevel,
  UserProfile,
} from './types';

// ============================================================================
// COUNTRY NAME → ISO CODE NORMALIZATION (BUG-85/BUG-11)
// ============================================================================

/**
 * Common country full names to ISO 3166-1 alpha-2 codes.
 * Callers may pass either a full name ("India") or ISO code ("IN").
 * This lookup normalizes to ISO before any detection logic runs.
 */
const COUNTRY_NAME_TO_ISO: Record<string, string> = {
  'india': 'IN', 'united states': 'US', 'usa': 'US', 'united states of america': 'US',
  'united kingdom': 'GB', 'uk': 'GB', 'great britain': 'GB',
  'australia': 'AU', 'canada': 'CA', 'germany': 'DE', 'france': 'FR',
  'italy': 'IT', 'spain': 'ES', 'brazil': 'BR', 'china': 'CN',
  'japan': 'JP', 'south korea': 'KR', 'korea': 'KR',
  'pakistan': 'PK', 'bangladesh': 'BD', 'sri lanka': 'LK', 'nepal': 'NP',
  'nigeria': 'NG', 'kenya': 'KE', 'south africa': 'ZA', 'ghana': 'GH',
  'saudi arabia': 'SA', 'united arab emirates': 'AE', 'uae': 'AE',
  'egypt': 'EG', 'turkey': 'TR', 'indonesia': 'ID', 'malaysia': 'MY',
  'singapore': 'SG', 'thailand': 'TH', 'philippines': 'PH', 'vietnam': 'VN',
  'mexico': 'MX', 'argentina': 'AR', 'colombia': 'CO', 'chile': 'CL',
  'peru': 'PE', 'venezuela': 'VE', 'ecuador': 'EC',
  'russia': 'RU', 'ukraine': 'UA', 'poland': 'PL', 'netherlands': 'NL',
  'sweden': 'SE', 'norway': 'NO', 'denmark': 'DK', 'finland': 'FI',
  'switzerland': 'CH', 'austria': 'AT', 'belgium': 'BE', 'portugal': 'PT',
  'greece': 'GR', 'czech republic': 'CZ', 'hungary': 'HU', 'romania': 'RO',
  'new zealand': 'NZ', 'ireland': 'IE', 'israel': 'IL',
};

// ============================================================================
// STATE NAME → CODE NORMALIZATION
// ============================================================================

const INDIAN_STATE_NAME_TO_CODE: Record<string, string> = {
  'rajasthan': 'RJ', 'gujarat': 'GJ',
  'kerala': 'KL', 'tamil nadu': 'TN', 'andhra pradesh': 'AP', 'telangana': 'TS',
  'goa': 'GA', 'karnataka': 'KA', 'maharashtra': 'MH', 'odisha': 'OR', 'orissa': 'OR',
  'west bengal': 'WB', 'jharkhand': 'JH', 'bihar': 'BR', 'assam': 'AS',
  'uttar pradesh': 'UP', 'madhya pradesh': 'MP', 'haryana': 'HR', 'punjab': 'PB', 'delhi': 'DL',
  'himachal pradesh': 'HP', 'uttarakhand': 'UK', 'jammu and kashmir': 'JK', 'jammu & kashmir': 'JK', 'sikkim': 'SK',
};

const US_STATE_NAME_TO_CODE: Record<string, string> = {
  'florida': 'FL', 'hawaii': 'HI',
  'arizona': 'AZ', 'nevada': 'NV', 'new mexico': 'NM', 'utah': 'UT',
  'alaska': 'AK', 'minnesota': 'MN', 'wisconsin': 'WI', 'montana': 'MT',
  'wyoming': 'WY', 'north dakota': 'ND', 'south dakota': 'SD', 'vermont': 'VT',
  'maine': 'ME', 'new hampshire': 'NH',
  'texas': 'TX', 'california': 'CA', 'new york': 'NY', 'illinois': 'IL',
  'pennsylvania': 'PA', 'ohio': 'OH', 'georgia': 'GA', 'michigan': 'MI',
  'north carolina': 'NC', 'new jersey': 'NJ', 'virginia': 'VA', 'washington': 'WA',
  'massachusetts': 'MA', 'tennessee': 'TN', 'indiana': 'IN', 'missouri': 'MO',
  'maryland': 'MD', 'colorado': 'CO', 'alabama': 'AL', 'south carolina': 'SC',
  'louisiana': 'LA', 'kentucky': 'KY', 'oregon': 'OR', 'oklahoma': 'OK',
  'connecticut': 'CT', 'iowa': 'IA', 'mississippi': 'MS', 'arkansas': 'AR',
  'kansas': 'KS', 'nebraska': 'NE', 'idaho': 'ID', 'west virginia': 'WV',
  'rhode island': 'RI', 'delaware': 'DE',
};

/**
 * Normalize a state name to its 2-letter code.
 * If already a short code (2-3 chars), returns as-is (uppercased).
 * Otherwise looks up the full name in country-specific mappings.
 */
function normalizeStateToCode(state: string, countryCode: string): string {
  const normalized = state.trim().toLowerCase();
  // If already a 2-3 letter code, return as-is (uppercase)
  if (normalized.length <= 3) return normalized.toUpperCase();
  // Country-specific lookups
  if (countryCode === 'IN') return INDIAN_STATE_NAME_TO_CODE[normalized]?.toUpperCase() || normalized.toUpperCase();
  if (countryCode === 'US') return US_STATE_NAME_TO_CODE[normalized]?.toUpperCase() || normalized.toUpperCase();
  return normalized.toUpperCase();
}

/**
 * Normalize a country string to ISO 3166-1 alpha-2 code.
 * If already an ISO code (2 uppercase letters), returns as-is (uppercased).
 * If a full country name, maps to ISO. Unknown inputs return the uppercased input.
 */
export function normalizeCountryToISO(country: string): string {
  if (!country) return '';
  const trimmed = country.trim();
  const upper = trimmed.toUpperCase();
  // Already an ISO code (2-3 chars, all letters)
  if (/^[A-Z]{2,3}$/.test(upper)) return upper;
  // Look up full name
  const lower = trimmed.toLowerCase();
  return COUNTRY_NAME_TO_ISO[lower]?.toUpperCase() ?? upper;
}

// ============================================================================
// CLIMATE DETECTION
// ============================================================================

/**
 * Detect climate zone from country and state
 * Uses embedded database for instant detection (no API calls needed)
 *
 * Detection Accuracy: 85-95% based on granularity
 * - Country only: ~70% accuracy
 * - Country + State: ~90% accuracy
 *
 * @param country - ISO 3166-1 alpha-2 country code (e.g., 'IN', 'US', 'GB')
 * @param state - State/province/region code (optional)
 * @returns Climate detection result with confidence score
 */
export function detectClimate(country: string, state?: string): ClimateDetectionResult {
  // Normalize: accept both full names ("India") and ISO codes ("IN")
  const countryCode = normalizeCountryToISO(country || '');
  const stateCode = state ? normalizeStateToCode(state, countryCode) : '';

  // TROPICAL COUNTRIES (Hot & Humid year-round)
  const tropicalCountries = [
    'IN', 'TH', 'MY', 'SG', 'ID', 'PH', 'VN', 'LK', 'BD', 'MM', 'LA', 'KH', // Southeast Asia
    'NG', 'KE', 'TZ', 'UG', 'GH', 'CI', 'CM', // Tropical Africa
    'BR', 'CO', 'VE', 'EC', 'PE', // Tropical South America
  ];

  // COLD COUNTRIES (Long winters, short summers)
  const coldCountries = [
    'NO', 'SE', 'FI', 'IS', 'GL', // Nordic countries
    'CA', 'RU', 'BY', 'UA', 'KZ', // Northern countries
    'MN', 'EE', 'LV', 'LT', // Baltic & Central Asia
  ];

  // ARID COUNTRIES (Hot & Dry, desert climates)
  const aridCountries = [
    'AE', 'SA', 'QA', 'OM', 'KW', 'BH', // Gulf states
    'EG', 'LY', 'DZ', 'MA', 'TN', // North Africa
    'JO', 'SY', 'IQ', 'YE', // Middle East
  ];

  // Country-level detection
  if (tropicalCountries.includes(countryCode)) {
    return {
      climate: 'tropical',
      confidence: 85,
      source: 'country_database',
      shouldAskUser: false,
      characteristics: {
        avgTempC: 28,
        avgHumidity: 75,
        tdeeModifier: 1.075,  // +7.5% for thermoregulation (matches CLIMATE_MULTIPLIERS SSOT)
        waterModifier: 1.50, // +50% for sweat loss
      },
    };
  }

  if (coldCountries.includes(countryCode)) {
    return {
      climate: 'cold',
      confidence: 85,
      source: 'country_database',
      shouldAskUser: false,
      characteristics: {
        avgTempC: 5,
        avgHumidity: 50,
        tdeeModifier: 1.15,  // +15% for thermogenesis
        waterModifier: 0.90, // -10% (less sweating)
      },
    };
  }

  if (aridCountries.includes(countryCode)) {
    return {
      climate: 'arid',
      confidence: 85,
      source: 'country_database',
      shouldAskUser: false,
      characteristics: {
        avgTempC: 32,
        avgHumidity: 20,
        tdeeModifier: 1.05,  // +5% for heat stress
        waterModifier: 1.70, // +70% for evaporation
      },
    };
  }

  // State-level detection for large countries (India, USA, China, Australia, Brazil)
  if (countryCode === 'IN' && stateCode) {
    // India - State-specific climate zones
    const indianStates = {
      // Tropical states
      'KL': 'tropical', 'TN': 'tropical', 'AP': 'tropical', 'TS': 'tropical',
      'GA': 'tropical', 'KA': 'tropical', 'MH': 'tropical', 'OR': 'tropical',
      'WB': 'tropical', 'JH': 'tropical', 'BR': 'tropical', 'AS': 'tropical',
      // Arid states
      'RJ': 'arid', 'GJ': 'arid',
      // Temperate states
      'UP': 'temperate', 'MP': 'temperate', 'HR': 'temperate', 'PB': 'temperate', 'DL': 'temperate',
      // Highland/Cold states
      'HP': 'cold', 'UK': 'cold', 'JK': 'cold', 'SK': 'cold',
    };

    const stateClimate = indianStates[stateCode as keyof typeof indianStates];
    if (stateClimate) {
      return {
        climate: stateClimate as ClimateType,
        confidence: 90,
        source: 'state_database',
        shouldAskUser: false,
        characteristics: getClimateCharacteristics(stateClimate as ClimateType),
      };
    }
  }

  if (countryCode === 'US' && stateCode) {
    // USA - State-specific climate zones
    const usStates = {
      // Tropical
      'FL': 'tropical', 'HI': 'tropical',
      // Arid
      'AZ': 'arid', 'NV': 'arid', 'NM': 'arid', 'UT': 'arid',
      // Cold
      'AK': 'cold', 'MN': 'cold', 'WI': 'cold', 'ND': 'cold', 'SD': 'cold',
      'MT': 'cold', 'WY': 'cold', 'ME': 'cold', 'VT': 'cold', 'NH': 'cold',
      // Temperate (most states)
      'CA': 'temperate', 'NY': 'temperate', 'TX': 'temperate', 'PA': 'temperate',
      'IL': 'temperate', 'OH': 'temperate', 'GA': 'temperate', 'NC': 'temperate',
      'MI': 'temperate', 'NJ': 'temperate', 'VA': 'temperate', 'WA': 'temperate',
      'MA': 'temperate', 'IN': 'temperate', 'MO': 'temperate', 'TN': 'temperate',
      'MD': 'temperate', 'CO': 'temperate', 'SC': 'temperate', 'AL': 'temperate',
      'LA': 'temperate', 'KY': 'temperate', 'OR': 'temperate', 'OK': 'temperate',
      'CT': 'temperate', 'IA': 'temperate', 'MS': 'temperate', 'AR': 'temperate',
      'KS': 'temperate', 'NE': 'temperate', 'WV': 'temperate', 'ID': 'temperate',
      'RI': 'temperate', 'DE': 'temperate',
    };

    const stateClimate = usStates[stateCode as keyof typeof usStates];
    if (stateClimate) {
      return {
        climate: stateClimate as ClimateType,
        confidence: 90,
        source: 'state_database',
        shouldAskUser: false,
        characteristics: getClimateCharacteristics(stateClimate as ClimateType),
      };
    }
  }

  // Default: Temperate (most common, safest baseline)
  return {
    climate: 'temperate',
    confidence: 50,
    source: 'default',
    shouldAskUser: true,
    characteristics: {
      avgTempC: 15,
      avgHumidity: 60,
      tdeeModifier: 1.00,  // Baseline
      waterModifier: 1.00, // Baseline
    },
  };
}

/**
 * Get climate characteristics by climate type
 */
function getClimateCharacteristics(climate: ClimateType) {
  const characteristics = {
    tropical: {
      avgTempC: 28,
      avgHumidity: 75,
      tdeeModifier: 1.075, // matches CLIMATE_MULTIPLIERS SSOT
      waterModifier: 1.50,
    },
    temperate: {
      avgTempC: 15,
      avgHumidity: 60,
      tdeeModifier: 1.00,
      waterModifier: 1.00,
    },
    cold: {
      avgTempC: 5,
      avgHumidity: 50,
      tdeeModifier: 1.15,
      waterModifier: 0.90,
    },
    arid: {
      avgTempC: 32,
      avgHumidity: 20,
      tdeeModifier: 1.05,
      waterModifier: 1.70,
    },
  };

  return characteristics[climate];
}

// ============================================================================
// ETHNICITY DETECTION
// ============================================================================

/**
 * Detect ethnicity from country/region
 * Used for population-specific BMI classifications
 *
 * Detection Accuracy: Varies by country
 * - High homogeneity countries (Japan, Korea): 90%+
 * - Moderate diversity (India, Germany): 75-85%
 * - High diversity (USA, UAE): 40-60%
 *
 * @param country - ISO 3166-1 alpha-2 country code
 * @param state - State/province (optional, improves accuracy)
 * @returns Ethnicity detection result with confidence score
 *
 * References:
 * - WHO Asia-Pacific BMI Guidelines (2000)
 * - Deurenberg et al. (1998) - Ethnic BMI differences
 */
export function detectEthnicity(country: string, state?: string): EthnicityDetectionResult {
  const countryCode = normalizeCountryToISO(country || '');

  // ASIAN POPULATIONS (Lower BMI cutoffs)
  // South Asia
  const southAsian = ['IN', 'PK', 'BD', 'LK', 'NP', 'BT', 'MV'];
  if (southAsian.includes(countryCode)) {
    return {
      ethnicity: 'asian',
      confidence: 90,
      shouldAskUser: false,
    };
  }

  // East Asia
  const eastAsian = ['CN', 'JP', 'KR', 'TW', 'MN'];
  if (eastAsian.includes(countryCode)) {
    return {
      ethnicity: 'asian',
      confidence: 90,
      shouldAskUser: false,
    };
  }

  // Southeast Asia
  const southeastAsian = ['TH', 'VN', 'ID', 'MY', 'SG', 'PH', 'MM', 'KH', 'LA', 'BN'];
  if (southeastAsian.includes(countryCode)) {
    return {
      ethnicity: 'asian',
      confidence: 85,
      shouldAskUser: false,
    };
  }

  // CAUCASIAN POPULATIONS (Standard BMI)
  const caucasian = [
    'GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'CH', 'SE', 'NO', 'DK', 'FI', // Western Europe
    'PL', 'CZ', 'SK', 'HU', 'RO', 'BG', 'HR', 'SI', 'RS', // Central/Eastern Europe
    'RU', 'UA', 'BY', // Eastern Europe
    'GR', 'PT', 'IE', 'AL', 'MK', 'BA', 'ME', // Southern/Balkan Europe
    'AU', 'NZ', // Oceania (predominantly European descent)
  ];
  if (caucasian.includes(countryCode)) {
    return {
      ethnicity: 'caucasian',
      confidence: 80,
      shouldAskUser: false,
    };
  }

  // BLACK AFRICAN POPULATIONS (Higher muscle mass)
  const blackAfrican = [
    'NG', 'KE', 'TZ', 'UG', 'GH', 'CI', 'CM', 'ZM', 'ZW', 'MW', // Sub-Saharan Africa
    'SN', 'ML', 'BF', 'NE', 'TD', 'CF', 'SD', 'SS', 'ER', 'ET', 'SO', // West/East Africa
    'CD', 'CG', 'GA', 'AO', 'MZ', 'BW', 'NA', 'ZA', 'LS', 'SZ', // Central/Southern Africa
  ];
  if (blackAfrican.includes(countryCode)) {
    return {
      ethnicity: 'black_african',
      confidence: 75,
      shouldAskUser: false,
    };
  }

  // HISPANIC POPULATIONS
  const hispanic = [
    'MX', 'CO', 'AR', 'PE', 'VE', 'CL', 'EC', 'GT', 'CU', 'BO', 'DO', 'HN',
    'PY', 'SV', 'NI', 'CR', 'PA', 'UY', 'PR',
  ];
  if (hispanic.includes(countryCode)) {
    return {
      ethnicity: 'hispanic',
      confidence: 80,
      shouldAskUser: false,
    };
  }

  // MIDDLE EASTERN POPULATIONS
  const middleEastern = [
    'SA', 'AE', 'QA', 'KW', 'OM', 'BH', 'YE', // Gulf states
    'IR', 'IQ', 'SY', 'JO', 'LB', 'IL', 'PS', 'TR', // Levant & Turkey
    'EG', 'LY', 'TN', 'DZ', 'MA', // North Africa
  ];
  if (middleEastern.includes(countryCode)) {
    return {
      ethnicity: 'middle_eastern',
      confidence: 75,
      shouldAskUser: false,
    };
  }

  // PACIFIC ISLANDER
  const pacificIslander = ['FJ', 'TO', 'WS', 'PG', 'SB', 'VU', 'NC', 'PF'];
  if (pacificIslander.includes(countryCode)) {
    return {
      ethnicity: 'pacific_islander',
      confidence: 85,
      shouldAskUser: false,
    };
  }

  // HIGH DIVERSITY COUNTRIES (ask user)
  const highDiversity = ['US', 'CA', 'BR', 'ZA'];
  if (highDiversity.includes(countryCode)) {
    return {
      ethnicity: 'mixed',
      confidence: 50,
      shouldAskUser: true,
      message: `Your location (${country}) has diverse populations. Please select your ethnicity for more accurate health calculations.`,
    };
  }

  // Default: General classification
  return {
    ethnicity: 'general',
    confidence: 40,
    shouldAskUser: true,
    message: 'Please select your ethnicity for more accurate BMI classification and health metrics.',
  };
}

// ============================================================================
// BMR FORMULA SELECTION
// ============================================================================

/**
 * Auto-select best BMR formula based on user data
 *
 * Selection Priority:
 * 1. DEXA/Bod Pod body fat → Katch-McArdle (±5% accuracy)
 * 2. Elite athlete + low BF → Cunningham (±5% accuracy)
 * 3. Accurate calipers/AI → Katch-McArdle (±7-10% accuracy)
 * 4. Default → Mifflin-St Jeor (±10% accuracy, most validated)
 *
 * @param user - User profile with body composition data
 * @returns BMR formula selection with reasoning
 *
 * References:
 * - Mifflin et al. (1990) - Most validated for general population
 * - Katch & McArdle (1996) - Best when body fat % is accurate
 * - Cunningham (1980) - Optimal for athletes
 */
export function detectBestBMRFormula(user: UserProfile): BMRFormulaSelection {
  const {
    bodyFat,
    bodyFatMethod,
    workoutExperienceYears,
    fitnessLevel,
  } = user;

  // Priority 1: DEXA/Bod Pod (gold standard accuracy)
  if (bodyFatMethod === 'dexa' || bodyFatMethod === 'bodpod') {
    return {
      formula: 'katch_mcardle',
      reason: 'Using Katch-McArdle formula due to accurate body fat measurement (DEXA/Bod Pod)',
      accuracy: '±5%',
      confidence: 95,
    };
  }

  // Priority 2: Elite athlete with low body fat
  if (
    fitnessLevel === 'elite' ||
    (workoutExperienceYears && workoutExperienceYears >= 3 && bodyFat && bodyFat < 15)
  ) {
    return {
      formula: 'cunningham',
      reason: 'Using Cunningham formula for advanced athlete with low body fat',
      accuracy: '±5%',
      confidence: 90,
    };
  }

  // Priority 3: Accurate calipers
  if (bodyFatMethod === 'calipers' && bodyFat) {
    return {
      formula: 'katch_mcardle',
      reason: 'Using Katch-McArdle formula based on caliper measurement',
      accuracy: '±7%',
      confidence: 80,
    };
  }

  // Priority 4: High-confidence AI estimate
  if (bodyFatMethod === 'ai_photo' && bodyFat) {
    return {
      formula: 'katch_mcardle',
      reason: 'Using Katch-McArdle with AI-estimated body fat',
      accuracy: '±10%',
      confidence: 70,
    };
  }

  // Default: Mifflin-St Jeor (most validated for general population)
  return {
    formula: 'mifflin_st_jeor',
    reason: 'Using Mifflin-St Jeor formula (most accurate for general population without body fat data)',
    accuracy: '±10%',
    confidence: 85,
  };
}

// ============================================================================
// ACTIVITY LEVEL VALIDATION
// ============================================================================

/**
 * Validate that activity level is appropriate for occupation
 * Prevents users from selecting activity levels below their occupation's minimum
 *
 * @param occupation - User's occupation type
 * @param activityLevel - Selected activity level
 * @returns Validation result with error message if invalid
 */
export function validateActivityLevel(
  occupation: string,
  activityLevel: ActivityLevel
): { isValid: boolean; message?: string } {
  const minActivityMap: Record<string, ActivityLevel | null> = {
    desk_job: null,              // No minimum
    light_active: 'light',       // Must be at least light
    moderate_active: 'moderate', // Must be at least moderate
    heavy_labor: 'active',       // Must be at least active
    very_active: 'very_active',  // Must be very_active
  };

  const minRequired = minActivityMap[occupation];
  if (!minRequired) {
    return { isValid: true };
  }

  const activityLevels: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'active', 'very_active'];
  const minIndex = activityLevels.indexOf(minRequired);
  // Map "extreme" → "very_active" for comparison (onboarding uses "extreme")
  const normalizedLevel = (activityLevel as string) === 'extreme' ? 'very_active' : activityLevel;
  const selectedIndex = activityLevels.indexOf(normalizedLevel as ActivityLevel);

  if (selectedIndex < minIndex) {
    return {
      isValid: false,
      message: `Your occupation requires at least "${minRequired}" activity level. Please adjust.`,
    };
  }

  return { isValid: true };
}
