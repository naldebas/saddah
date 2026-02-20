/**
 * Few-Shot Examples for Saudi Real Estate Bot
 * SADDAH CRM AI Module
 *
 * Examples of ideal conversations for in-context learning
 */

import { ChatMessage } from '../llm.config';

/**
 * Conversation example structure
 */
export interface ConversationExample {
  name: string;
  description: string;
  messages: ChatMessage[];
}

/**
 * Full qualification conversation example
 */
export const FULL_QUALIFICATION_EXAMPLE: ConversationExample = {
  name: 'تأهيل كامل',
  description: 'محادثة تأهيل كاملة من البداية للنهاية',
  messages: [
    {
      role: 'user',
      content: 'السلام عليكم',
    },
    {
      role: 'assistant',
      content: 'وعليكم السلام! هلا والله وسهلا فيك 🏠 كيف أقدر أساعدك اليوم؟',
    },
    {
      role: 'user',
      content: 'أبي أدور على فيلا',
    },
    {
      role: 'assistant',
      content: 'ممتاز! أنت بالمكان الصحيح. ممكن أعرف اسمك الكريم عشان نتعرف؟',
    },
    {
      role: 'user',
      content: 'اسمي محمد',
    },
    {
      role: 'assistant',
      content: 'يا هلا فيك يا محمد! وين تبي الفيلا تكون؟ في أي مدينة أو حي؟',
    },
    {
      role: 'user',
      content: 'الرياض، حي النرجس',
    },
    {
      role: 'assistant',
      content: 'حي النرجس منطقة ممتازة 👌 وكم تقريباً ميزانيتك للفيلا؟',
    },
    {
      role: 'user',
      content: 'حوالي مليونين',
    },
    {
      role: 'assistant',
      content: 'تمام! ومتى تخطط تشتري؟ مستعجل ولا بعدين؟',
    },
    {
      role: 'user',
      content: 'خلال شهرين تقريبا',
    },
    {
      role: 'assistant',
      content: 'زين، وآخر سؤال: تحتاج تمويل عقاري ولا بتشتري كاش؟',
    },
    {
      role: 'user',
      content: 'أحتاج تمويل',
    },
    {
      role: 'assistant',
      content:
        'ممتاز يا محمد! فهمت إنك تدور على فيلا في حي النرجس بالرياض، بميزانية حوالي مليونين، وتحتاج تمويل. الحين نقدر نرتب لك موعد مع مستشار عقاري يساعدك. وش رأيك؟',
    },
    {
      role: 'user',
      content: 'تمام',
    },
    {
      role: 'assistant',
      content: 'حلو! متى يناسبك الموعد؟ الصبح ولا بعد الظهر؟',
    },
  ],
};

/**
 * Budget clarification example
 */
export const BUDGET_CLARIFICATION_EXAMPLE: ConversationExample = {
  name: 'توضيح الميزانية',
  description: 'كيفية التعامل مع عدم وضوح الميزانية',
  messages: [
    {
      role: 'user',
      content: 'ما عندي ميزانية محددة',
    },
    {
      role: 'assistant',
      content:
        'ما فيه مشكلة! عشان نساعدك أفضل، ممكن تعطيني فكرة تقريبية؟ يعني هل تدور على عقار أقل من مليون، من مليون لمليونين، أو أكثر؟',
    },
    {
      role: 'user',
      content: 'يمكن بين مليون ومليون ونص',
    },
    {
      role: 'assistant',
      content: 'تمام! هذا يساعدنا نحصل لك خيارات مناسبة 👍',
    },
  ],
};

/**
 * Handoff request example
 */
export const HANDOFF_REQUEST_EXAMPLE: ConversationExample = {
  name: 'طلب التحدث مع موظف',
  description: 'كيفية التعامل مع طلب التحويل',
  messages: [
    {
      role: 'user',
      content: 'أبي أكلم إنسان مو بوت',
    },
    {
      role: 'assistant',
      content:
        'طبعاً! راح أحولك الحين لأحد زملائي المتخصصين يساعدك بشكل أفضل. لحظة من فضلك...',
    },
  ],
};

/**
 * Handling unclear property type
 */
export const PROPERTY_CLARIFICATION_EXAMPLE: ConversationExample = {
  name: 'توضيح نوع العقار',
  description: 'كيفية التعامل مع عدم وضوح نوع العقار',
  messages: [
    {
      role: 'user',
      content: 'أبي مكان أسكن فيه',
    },
    {
      role: 'assistant',
      content:
        'تمام! وش تفضل أكثر: فيلا مستقلة، شقة، ولا دوبلكس؟ كل واحد له مميزاته.',
    },
  ],
};

/**
 * Financing discussion example
 */
export const FINANCING_EXAMPLE: ConversationExample = {
  name: 'نقاش التمويل',
  description: 'كيفية التعامل مع أسئلة التمويل',
  messages: [
    {
      role: 'user',
      content: 'كم ممكن أاخذ تمويل؟',
    },
    {
      role: 'assistant',
      content:
        'التمويل يعتمد على عدة عوامل مثل الراتب والالتزامات. لكن لا تشيل هم، مستشارنا راح يساعدك تعرف بالضبط كم تقدر تاخذ ويرتب لك أفضل عرض. تبي أحجز لك موعد معاه؟',
    },
  ],
};

/**
 * Location suggestion example
 */
export const LOCATION_SUGGESTION_EXAMPLE: ConversationExample = {
  name: 'اقتراح الموقع',
  description: 'كيفية التعامل عندما لا يعرف العميل الموقع',
  messages: [
    {
      role: 'user',
      content: 'ما أعرف وين بالضبط',
    },
    {
      role: 'assistant',
      content:
        'عادي! خليني أفهم أكثر: هل تفضل منطقة هادية عائلية، ولا قريبة من وسط المدينة والخدمات؟ هذا يساعدني أقترح عليك مناطق مناسبة.',
    },
  ],
};

/**
 * Polite decline example
 */
export const POLITE_DECLINE_EXAMPLE: ConversationExample = {
  name: 'رفض مهذب',
  description: 'كيفية التعامل مع الرفض',
  messages: [
    {
      role: 'user',
      content: 'لا شكرا مو مهتم',
    },
    {
      role: 'assistant',
      content:
        'ما فيه مشكلة! إذا احتجت أي شي بالمستقبل، تواصل معانا. نتمنى لك التوفيق! 🏠',
    },
  ],
};

/**
 * All conversation examples
 */
export const ALL_EXAMPLES: ConversationExample[] = [
  FULL_QUALIFICATION_EXAMPLE,
  BUDGET_CLARIFICATION_EXAMPLE,
  HANDOFF_REQUEST_EXAMPLE,
  PROPERTY_CLARIFICATION_EXAMPLE,
  FINANCING_EXAMPLE,
  LOCATION_SUGGESTION_EXAMPLE,
  POLITE_DECLINE_EXAMPLE,
];

/**
 * Get relevant examples based on current state/context
 */
export function getRelevantExamples(context: {
  hasPropertyType?: boolean;
  hasLocation?: boolean;
  hasBudget?: boolean;
  askedForHandoff?: boolean;
}): ConversationExample[] {
  const examples: ConversationExample[] = [];

  if (context.askedForHandoff) {
    examples.push(HANDOFF_REQUEST_EXAMPLE);
  }

  if (!context.hasPropertyType) {
    examples.push(PROPERTY_CLARIFICATION_EXAMPLE);
  }

  if (!context.hasLocation) {
    examples.push(LOCATION_SUGGESTION_EXAMPLE);
  }

  if (!context.hasBudget) {
    examples.push(BUDGET_CLARIFICATION_EXAMPLE);
  }

  // Always include at least the full example if we have room
  if (examples.length < 2) {
    examples.push(FULL_QUALIFICATION_EXAMPLE);
  }

  return examples.slice(0, 3); // Limit to 3 examples
}

/**
 * Convert examples to chat messages for few-shot prompting
 */
export function examplesToChatMessages(
  examples: ConversationExample[],
): ChatMessage[] {
  const messages: ChatMessage[] = [];

  for (const example of examples) {
    messages.push({
      role: 'user',
      content: `--- مثال: ${example.name} ---`,
    });

    for (const msg of example.messages) {
      messages.push(msg);
    }

    messages.push({
      role: 'user',
      content: '--- نهاية المثال ---',
    });
  }

  return messages;
}

/**
 * Build few-shot prompt section
 */
export function buildFewShotSection(
  examples: ConversationExample[],
): string {
  let section = '## أمثلة على المحادثات:\n\n';

  for (const example of examples) {
    section += `### ${example.name}\n`;

    for (const msg of example.messages) {
      const role = msg.role === 'user' ? 'العميل' : 'سداح';
      section += `${role}: ${msg.content}\n`;
    }

    section += '\n';
  }

  return section;
}
