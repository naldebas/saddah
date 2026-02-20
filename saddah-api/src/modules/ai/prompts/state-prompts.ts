/**
 * State-specific Prompts
 * SADDAH CRM AI Module
 *
 * Prompts for each qualification state
 */

import { QualificationState, QualificationData } from '../state-machine/states';

/**
 * State prompt configuration
 */
export interface StatePrompt {
  instruction: string;
  sampleResponses: string[];
  followUp?: string;
}

/**
 * State-specific prompts
 */
export const STATE_PROMPTS: Record<QualificationState, StatePrompt> = {
  [QualificationState.INITIAL]: {
    instruction: 'رحب بالعميل بطريقة ودية وسعودية.',
    sampleResponses: [
      'هلا والله! أهلاً وسهلاً فيك. كيف أقدر أساعدك اليوم؟ 🏠',
      'السلام عليكم! يا هلا فيك. تبي تدور على عقار؟',
    ],
  },

  [QualificationState.GREETING]: {
    instruction: 'رد على تحية العميل وابدأ بالتأهيل بسؤال بسيط.',
    sampleResponses: [
      'يا هلا فيك! ممكن أعرف اسمك الكريم عشان نتواصل بشكل أحسن؟',
      'أهلين وسهلين! قبل ما نبدأ، ممكن تعرفني على اسمك؟',
    ],
  },

  [QualificationState.ASK_NAME]: {
    instruction: 'اسأل العميل عن اسمه بطريقة مهذبة.',
    sampleResponses: [
      'ممكن أعرف اسمك الكريم؟',
      'وش اسمك عشان أعرف أناديك؟',
    ],
    followUp: 'إذا أعطاك الاسم، شكره وانتقل للسؤال التالي.',
  },

  [QualificationState.ASK_PROPERTY_TYPE]: {
    instruction: 'اسأل عن نوع العقار المطلوب.',
    sampleResponses: [
      'تمام {name}! وش نوع العقار اللي تدور عليه؟ فيلا، شقة، أرض؟',
      'زين {name}، تبي فيلا؟ شقة؟ ولا تدور على أرض؟',
    ],
    followUp: 'قدم خيارات واضحة للعميل.',
  },

  [QualificationState.ASK_LOCATION]: {
    instruction: 'اسأل عن الموقع أو المنطقة المفضلة.',
    sampleResponses: [
      'ممتاز! وأي منطقة أو حي تفضل؟',
      'زين، في أي مدينة تبي العقار؟ وهل عندك حي معين بالبال؟',
    ],
    followUp: 'إذا قال اسم مدينة، اسأل عن الحي المفضل.',
  },

  [QualificationState.ASK_BUDGET]: {
    instruction: 'اسأل عن الميزانية بطريقة لبقة.',
    sampleResponses: [
      'تمام! وكم تقريباً ميزانيتك للعقار؟',
      'وبالنسبة للسعر، وش النطاق اللي يناسبك؟',
    ],
    followUp: 'كن متفهماً إذا لم يرد العميل الإفصاح.',
  },

  [QualificationState.ASK_TIMELINE]: {
    instruction: 'اسأل عن متى يخطط للشراء.',
    sampleResponses: [
      'حلو! ومتى تخطط تشتري؟ الحين ولا بعدين؟',
      'وهل تبي تشتري قريب؟ ولا لسه تدور وتقارن؟',
    ],
    followUp: 'وضح الخيارات: الحين، خلال شهر، خلال 3 شهور، مو مستعجل.',
  },

  [QualificationState.ASK_FINANCING]: {
    instruction: 'اسأل إذا يحتاج تمويل عقاري.',
    sampleResponses: [
      'آخر سؤال: هل تحتاج تمويل عقاري؟ ولا بتشتري كاش؟',
      'وبالنسبة للدفع، تبي تمويل من البنك ولا كاش؟',
    ],
    followUp: 'إذا قال نعم، وضح أننا نقدر نساعده في التمويل.',
  },

  [QualificationState.QUALIFIED]: {
    instruction: 'لخص ما فهمته واقترح الخطوة التالية.',
    sampleResponses: [
      'ممتاز {name}! فهمت إنك تدور على {propertyType} في {location} بميزانية حوالي {budget}. الحين نقدر نرتب لك موعد مع أحد مستشارينا. وش رأيك؟',
    ],
  },

  [QualificationState.OFFER_APPOINTMENT]: {
    instruction: 'اعرض تحديد موعد مع مستشار.',
    sampleResponses: [
      'ممتاز! تبي أرتب لك موعد مع مستشار عقاري يساعدك أكثر؟',
      'حلو! خليني أحجز لك موعد مع أحد المستشارين. متى يناسبك؟',
    ],
  },

  [QualificationState.SCHEDULE_APPOINTMENT]: {
    instruction: 'ساعد العميل في اختيار موعد مناسب.',
    sampleResponses: [
      'تمام! متى يناسبك؟ الصبح ولا العصر؟',
      'زين، نقدر نحجز لك يوم {suggestedDate}. وش رأيك؟',
    ],
  },

  [QualificationState.HUMAN_HANDOFF]: {
    instruction: 'أخبر العميل أنك ستحوله لموظف.',
    sampleResponses: [
      'تمام، راح أحولك الحين لأحد زملائي يساعدك بشكل أفضل. لحظة من فضلك...',
      'طيب، خليني أوصلك بأحد المستشارين مباشرة. انتظر لحظة...',
    ],
  },

  [QualificationState.CLOSED]: {
    instruction: 'اختم المحادثة بشكل مهذب.',
    sampleResponses: [
      'شكراً لك! إذا احتجت أي شي تواصل معانا. الله يوفقك! 🏠',
      'تشرفنا بخدمتك. لا تتردد تتواصل معانا لو عندك أي استفسار.',
    ],
  },
};

/**
 * Get prompt for current state with data interpolation
 */
export function getStatePrompt(
  state: QualificationState,
  data: QualificationData,
): StatePrompt {
  const prompt = STATE_PROMPTS[state];

  // Interpolate variables in sample responses
  const interpolatedResponses = prompt.sampleResponses.map((response) =>
    interpolatePrompt(response, data),
  );

  return {
    ...prompt,
    sampleResponses: interpolatedResponses,
  };
}

/**
 * Interpolate variables in prompt text
 */
export function interpolatePrompt(
  text: string,
  data: QualificationData,
): string {
  let result = text;

  // Replace placeholders with actual values
  if (data.name) {
    result = result.replace(/{name}/g, data.name);
  }
  if (data.propertyType) {
    result = result.replace(/{propertyType}/g, getPropertyTypeArabic(data.propertyType));
  }
  if (data.location?.city) {
    result = result.replace(/{location}/g, data.location.city);
  }
  if (data.budget?.max) {
    result = result.replace(/{budget}/g, formatBudget(data.budget));
  }

  // Remove any remaining placeholders
  result = result.replace(/{[^}]+}/g, '');

  return result;
}

/**
 * Get Arabic name for property type
 */
function getPropertyTypeArabic(type: string): string {
  const types: Record<string, string> = {
    villa: 'فيلا',
    apartment: 'شقة',
    land: 'أرض',
    duplex: 'دوبلكس',
    compound: 'كمباوند',
    building: 'عمارة',
    studio: 'ستوديو',
    penthouse: 'روف',
    townhouse: 'تاون هاوس',
  };
  return types[type] || type;
}

/**
 * Format budget for display
 */
function formatBudget(budget: { min?: number; max?: number; currency: string }): string {
  if (budget.max) {
    if (budget.max >= 1000000) {
      return `${(budget.max / 1000000).toFixed(1)} مليون`;
    }
    return `${budget.max.toLocaleString('ar-SA')} ريال`;
  }
  return '';
}

/**
 * Build user message context for LLM
 */
export function buildMessageContext(
  state: QualificationState,
  data: QualificationData,
): string {
  const prompt = getStatePrompt(state, data);
  const collectedInfo = [];

  if (data.name) collectedInfo.push(`الاسم: ${data.name}`);
  if (data.propertyType)
    collectedInfo.push(`نوع العقار: ${getPropertyTypeArabic(data.propertyType)}`);
  if (data.location?.city) collectedInfo.push(`الموقع: ${data.location.city}`);
  if (data.budget?.max)
    collectedInfo.push(`الميزانية: ${formatBudget(data.budget)}`);
  if (data.timeline) collectedInfo.push(`التوقيت: ${data.timeline}`);
  if (data.financingNeeded !== undefined)
    collectedInfo.push(`التمويل: ${data.financingNeeded ? 'نعم' : 'لا'}`);

  return `
الحالة الحالية: ${state}

المعلومات المجموعة:
${collectedInfo.length > 0 ? collectedInfo.join('\n') : 'لا توجد معلومات بعد'}

التعليمات: ${prompt.instruction}
${prompt.followUp ? `ملاحظة: ${prompt.followUp}` : ''}
`;
}
