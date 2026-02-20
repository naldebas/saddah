/**
 * Saudi Real Estate Terminology
 * SADDAH CRM AI Module
 *
 * Real estate terms in Saudi Arabic dialect with MSA equivalents
 */

/**
 * Property types
 */
export const PROPERTY_TYPES = {
  // Saudi dialect terms
  فيلا: { type: 'villa', confidence: 1.0 },
  فله: { type: 'villa', confidence: 0.9 },
  شقة: { type: 'apartment', confidence: 1.0 },
  شقه: { type: 'apartment', confidence: 0.9 },
  دوبلكس: { type: 'duplex', confidence: 1.0 },
  دبلكس: { type: 'duplex', confidence: 0.9 },
  أرض: { type: 'land', confidence: 1.0 },
  ارض: { type: 'land', confidence: 0.9 },
  قطعة_أرض: { type: 'land', confidence: 1.0 },
  كمباوند: { type: 'compound', confidence: 1.0 },
  كمبوند: { type: 'compound', confidence: 0.9 },
  مجمع_سكني: { type: 'compound', confidence: 0.9 },
  عمارة: { type: 'building', confidence: 1.0 },
  عماره: { type: 'building', confidence: 0.9 },
  استديو: { type: 'studio', confidence: 1.0 },
  ستوديو: { type: 'studio', confidence: 0.9 },
  روف: { type: 'penthouse', confidence: 0.9 },
  بنتهاوس: { type: 'penthouse', confidence: 1.0 },
  تاون_هاوس: { type: 'townhouse', confidence: 1.0 },
  تاونهاوس: { type: 'townhouse', confidence: 0.9 },

  // English terms commonly used
  villa: { type: 'villa', confidence: 0.9 },
  apartment: { type: 'apartment', confidence: 0.9 },
  duplex: { type: 'duplex', confidence: 0.9 },
  land: { type: 'land', confidence: 0.9 },
  compound: { type: 'compound', confidence: 0.9 },
};

export const PROPERTY_TYPE_PATTERNS = [
  { pattern: /فيل[اه]/, type: 'villa' },
  { pattern: /شق[ةه]/, type: 'apartment' },
  { pattern: /د[وب]بلكس/, type: 'duplex' },
  { pattern: /أرض|ارض|قطعة أرض/, type: 'land' },
  { pattern: /كمب[او]ند|مجمع سكني/, type: 'compound' },
  { pattern: /عمار[ةه]/, type: 'building' },
  { pattern: /است?[وي]ديو/, type: 'studio' },
  { pattern: /روف|بنتهاوس/, type: 'penthouse' },
  { pattern: /تاون\s*هاوس/, type: 'townhouse' },
];

/**
 * Saudi cities and regions
 */
export const SAUDI_LOCATIONS = {
  // Major cities
  الرياض: { city: 'riyadh', region: 'central' },
  رياض: { city: 'riyadh', region: 'central' },
  جدة: { city: 'jeddah', region: 'western' },
  جده: { city: 'jeddah', region: 'western' },
  الدمام: { city: 'dammam', region: 'eastern' },
  دمام: { city: 'dammam', region: 'eastern' },
  مكة: { city: 'makkah', region: 'western' },
  المدينة: { city: 'madinah', region: 'western' },
  المدينة_المنورة: { city: 'madinah', region: 'western' },
  الخبر: { city: 'khobar', region: 'eastern' },
  الطائف: { city: 'taif', region: 'western' },
  تبوك: { city: 'tabuk', region: 'northern' },
  القصيم: { city: 'qassim', region: 'central' },
  أبها: { city: 'abha', region: 'southern' },
  حائل: { city: 'hail', region: 'northern' },
  نجران: { city: 'najran', region: 'southern' },
  جيزان: { city: 'jazan', region: 'southern' },
  الأحساء: { city: 'ahsa', region: 'eastern' },
  الجبيل: { city: 'jubail', region: 'eastern' },
  ينبع: { city: 'yanbu', region: 'western' },

  // Popular Riyadh neighborhoods
  حي_النرجس: { district: 'narjis', city: 'riyadh' },
  النرجس: { district: 'narjis', city: 'riyadh' },
  حي_الملقا: { district: 'malqa', city: 'riyadh' },
  الملقا: { district: 'malqa', city: 'riyadh' },
  حي_الياسمين: { district: 'yasmin', city: 'riyadh' },
  الياسمين: { district: 'yasmin', city: 'riyadh' },
  حي_العليا: { district: 'olaya', city: 'riyadh' },
  العليا: { district: 'olaya', city: 'riyadh' },
  حي_السليمانية: { district: 'sulaimaniya', city: 'riyadh' },
  السليمانية: { district: 'sulaimaniya', city: 'riyadh' },
  حي_الربوة: { district: 'rabwa', city: 'riyadh' },
  الربوة: { district: 'rabwa', city: 'riyadh' },
  حي_الورود: { district: 'wurud', city: 'riyadh' },
  الورود: { district: 'wurud', city: 'riyadh' },

  // Popular Jeddah neighborhoods
  حي_الحمراء: { district: 'hamra', city: 'jeddah' },
  الحمراء: { district: 'hamra', city: 'jeddah' },
  حي_الروضة: { district: 'rawda', city: 'jeddah' },
  الروضة: { district: 'rawda', city: 'jeddah' },
  حي_النعيم: { district: 'naeem', city: 'jeddah' },
  النعيم: { district: 'naeem', city: 'jeddah' },
  أبحر: { district: 'obhur', city: 'jeddah' },
  أبحر_الشمالية: { district: 'obhur_north', city: 'jeddah' },
};

/**
 * Budget terms
 */
export const BUDGET_TERMS = {
  ميزانية: 'budget',
  ميزانيتي: 'my_budget',
  سعر: 'price',
  قيمة: 'value',
  تكلفة: 'cost',
  مليون: 'million',
  ألف: 'thousand',
  الف: 'thousand',
  ريال: 'sar',
  ر_س: 'sar',
};

/**
 * Real estate features
 */
export const PROPERTY_FEATURES = {
  // Rooms
  غرفة_نوم: 'bedroom',
  غرف_نوم: 'bedrooms',
  صالة: 'living_room',
  مجلس: 'majlis',
  مطبخ: 'kitchen',
  حمام: 'bathroom',
  دورة_مياه: 'bathroom',

  // Areas
  مسبح: 'pool',
  حديقة: 'garden',
  موقف: 'parking',
  جراج: 'garage',
  مصعد: 'elevator',
  تراس: 'terrace',
  بلكونة: 'balcony',
  شرفة: 'balcony',

  // Conditions
  جديد: 'new',
  مجدد: 'renovated',
  تحت_الإنشاء: 'under_construction',
  جاهز: 'ready',
  مؤثث: 'furnished',
  شبه_مؤثث: 'semi_furnished',
  فارغ: 'unfurnished',
};

/**
 * Transaction types
 */
export const TRANSACTION_TYPES = {
  شراء: 'buy',
  أشتري: 'buy',
  اشتري: 'buy',
  أبي: 'buy',
  ابي: 'buy',
  أبغى: 'buy',
  ابغى: 'buy',
  بيع: 'sell',
  أبيع: 'sell',
  ابيع: 'sell',
  إيجار: 'rent',
  ايجار: 'rent',
  استأجر: 'rent',
  استثمار: 'invest',
};

/**
 * Extract property type from text
 */
export function extractPropertyType(
  text: string,
): { type: string; confidence: number } | null {
  const normalizedText = text.trim().toLowerCase();

  for (const { pattern, type } of PROPERTY_TYPE_PATTERNS) {
    if (pattern.test(normalizedText)) {
      return { type, confidence: 0.9 };
    }
  }

  // Direct lookup
  for (const [term, value] of Object.entries(PROPERTY_TYPES)) {
    if (normalizedText.includes(term.replace(/_/g, ' '))) {
      return value;
    }
  }

  return null;
}

/**
 * Extract location from text
 */
export function extractLocation(
  text: string,
): { city?: string; district?: string; region?: string } | null {
  const normalizedText = text.trim();

  for (const [term, location] of Object.entries(SAUDI_LOCATIONS)) {
    const searchTerm = term.replace(/_/g, ' ');
    if (normalizedText.includes(searchTerm)) {
      return location;
    }
  }

  return null;
}

/**
 * Extract budget from text
 */
export function extractBudget(text: string): {
  min?: number;
  max?: number;
  currency: string;
} | null {
  const normalizedText = text.trim();

  // Pattern: X million
  const millionMatch = normalizedText.match(/(\d+(?:\.\d+)?)\s*مليون/);
  if (millionMatch) {
    const value = parseFloat(millionMatch[1]) * 1000000;
    return { max: value, currency: 'SAR' };
  }

  // Pattern: X thousand
  const thousandMatch = normalizedText.match(/(\d+(?:\.\d+)?)\s*(ألف|الف)/);
  if (thousandMatch) {
    const value = parseFloat(thousandMatch[1]) * 1000;
    return { max: value, currency: 'SAR' };
  }

  // Pattern: from X to Y
  const rangeMatch = normalizedText.match(
    /من\s*(\d+(?:,\d+)?)\s*(إلى|الى|ل|-)?\s*(\d+(?:,\d+)?)/,
  );
  if (rangeMatch) {
    const min = parseInt(rangeMatch[1].replace(/,/g, ''));
    const max = parseInt(rangeMatch[3].replace(/,/g, ''));
    return { min, max, currency: 'SAR' };
  }

  // Simple number
  const simpleMatch = normalizedText.match(/(\d{4,}(?:,\d{3})*)/);
  if (simpleMatch) {
    const value = parseInt(simpleMatch[1].replace(/,/g, ''));
    return { max: value, currency: 'SAR' };
  }

  return null;
}

/**
 * Extract transaction type from text
 */
export function extractTransactionType(text: string): string | null {
  const normalizedText = text.trim();

  for (const [term, type] of Object.entries(TRANSACTION_TYPES)) {
    if (normalizedText.includes(term)) {
      return type;
    }
  }

  return null;
}
