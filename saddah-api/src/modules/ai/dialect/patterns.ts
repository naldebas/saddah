/**
 * Saudi Arabic Dialect Patterns
 * SADDAH CRM AI Module
 *
 * Common patterns for Saudi Arabic text recognition
 */

/**
 * Greetings in Saudi dialect
 */
export const GREETINGS = {
  // Informal greetings
  هلا: 'hello_informal',
  هلا_والله: 'hello_warm',
  أهلين: 'hello_plural',
  أهلا: 'hello_formal',
  مرحبا: 'welcome',
  مساء_الخير: 'good_evening',
  صباح_الخير: 'good_morning',
  السلام_عليكم: 'peace_greeting',

  // Patterns with variations
  'هلا والله': 'hello_warm',
  'يا هلا': 'hello_informal',
  'يا مرحبا': 'welcome',
};

export const GREETING_PATTERNS = [
  /^(هلا|أهلين|أهلا|مرحبا|السلام عليكم)/,
  /^(صباح|مساء)\s*(الخير|النور)/,
  /^يا\s*(هلا|مرحبا)/,
];

/**
 * Affirmations in Saudi dialect
 */
export const AFFIRMATIONS = {
  تمام: 'perfect',
  زين: 'good',
  أكيد: 'sure',
  إن_شاء_الله: 'inshallah',
  ماشي: 'ok',
  طيب: 'ok_formal',
  خلاص: 'done',
  حاضر: 'ready',
  موافق: 'agree',

  // Patterns with variations
  'إن شاء الله': 'inshallah',
  'ان شاء الله': 'inshallah',
};

export const AFFIRMATION_PATTERNS = [
  /^(تمام|زين|أكيد|ماشي|طيب|خلاص|حاضر|موافق)/,
  /إن\s*شاء\s*الله/,
  /^(أوكي|اوكي|ok|OK)/i,
];

/**
 * Negations in Saudi dialect
 */
export const NEGATIONS = {
  لا: 'no',
  ما_أبي: 'dont_want',
  مب_مهتم: 'not_interested',
  ما_يناسبني: 'doesnt_suit_me',

  // Patterns
  'ما أبي': 'dont_want',
  'مب مهتم': 'not_interested',
  'ما يناسبني': 'doesnt_suit_me',
  'مو زين': 'not_good',
};

export const NEGATION_PATTERNS = [
  /^لا\s/,
  /ما\s*(أبي|ابي|ابغى|أبغى)/,
  /مب\s*(مهتم|فاضي)/,
  /ما\s*(يناسبني|يناسب)/,
];

/**
 * Question words in Saudi dialect
 */
export const QUESTION_WORDS = {
  وش: 'what',
  كيف: 'how',
  ليش: 'why',
  وين: 'where',
  متى: 'when',
  كم: 'how_much',
  منو: 'who',

  // MSA equivalents
  ماذا: 'what_msa',
  أين: 'where_msa',
  لماذا: 'why_msa',
};

export const QUESTION_PATTERNS = [
  /^(وش|كيف|ليش|وين|متى|كم|منو)/,
  /(وش|كيف|ليش|وين|متى|كم|منو)\s/,
  /\?$/,
  /؟$/,
];

/**
 * Urgency indicators
 */
export const URGENCY_PATTERNS = [
  /الحين/,
  /فوري/,
  /ضروري/,
  /مستعجل/,
  /بسرعة/,
  /عاجل/,
];

/**
 * Budget-related patterns
 */
export const BUDGET_PATTERNS = [
  /ميزانيتي\s*(حوالي|تقريبا)?\s*(\d+)/,
  /عندي\s*(حوالي|تقريبا)?\s*(\d+)/,
  /أقصى\s*سعر\s*(\d+)/,
  /ما\s*يزيد\s*عن\s*(\d+)/,
  /من\s*(\d+)\s*(إلى|الى|ل)\s*(\d+)/,
  /(\d+)\s*(مليون|ألف|الف)/,
];

/**
 * Timeline indicators
 */
export const TIMELINE_PATTERNS = {
  immediate: [/الحين/, /فوري/, /بأسرع وقت/],
  within_month: [/خلال شهر/, /الشهر الجاي/, /قريب/],
  within_quarter: [/خلال (٣|3) شهور/, /الربع الجاي/],
  within_year: [/خلال سنة/, /السنة الجاية/],
  flexible: [/مو مستعجل/, /بدون وقت محدد/, /متى ما صار/],
};

/**
 * Financing-related patterns
 */
export const FINANCING_PATTERNS = {
  needs_financing: [
    /أحتاج تمويل/,
    /ابي تمويل/,
    /أبغى تمويل/,
    /بالتقسيط/,
    /قرض عقاري/,
  ],
  cash: [
    /كاش/,
    /نقد/,
    /دفعة واحدة/,
    /بدون تمويل/,
  ],
  partial: [
    /دفعة أولى/,
    /مقدم/,
    /جزء تمويل/,
  ],
};

/**
 * Handoff trigger phrases - when bot should transfer to human
 */
export const HANDOFF_TRIGGERS = [
  /أبي أكلم (إنسان|شخص|موظف)/,
  /أبغى أتكلم مع (إنسان|شخص|موظف)/,
  /حولني (لموظف|لشخص)/,
  /ما أبي البوت/,
  /ما أبي الآلة/,
  /شكوى/,
  /مشكلة كبيرة/,
  /غلطان/,
  /خطأ/,
];

/**
 * Check if text matches any handoff trigger
 */
export function isHandoffTrigger(text: string): boolean {
  const normalizedText = text.trim().toLowerCase();
  return HANDOFF_TRIGGERS.some((pattern) => pattern.test(normalizedText));
}

/**
 * Check if text contains a question
 */
export function isQuestion(text: string): boolean {
  return QUESTION_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Check if text is an affirmation
 */
export function isAffirmation(text: string): boolean {
  const normalizedText = text.trim();
  return AFFIRMATION_PATTERNS.some((pattern) => pattern.test(normalizedText));
}

/**
 * Check if text is a negation
 */
export function isNegation(text: string): boolean {
  const normalizedText = text.trim();
  return NEGATION_PATTERNS.some((pattern) => pattern.test(normalizedText));
}

/**
 * Check if text is a greeting
 */
export function isGreeting(text: string): boolean {
  const normalizedText = text.trim();
  return GREETING_PATTERNS.some((pattern) => pattern.test(normalizedText));
}
