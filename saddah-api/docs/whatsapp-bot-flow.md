# WhatsApp Bot Flow Documentation

This document explains the qualification bot flow, state machine, and customization options.

## Table of Contents

1. [Overview](#overview)
2. [Qualification State Machine](#qualification-state-machine)
3. [State Descriptions](#state-descriptions)
4. [Sample Conversation Flow](#sample-conversation-flow)
5. [Customizing Prompts](#customizing-prompts)
6. [Adding New States](#adding-new-states)
7. [Handoff Triggers](#handoff-triggers)
8. [Qualification Scoring](#qualification-scoring)

---

## Overview

The SADDAH WhatsApp bot uses a state machine to guide conversations through a lead qualification process. The bot:

1. **Greets** new contacts in Saudi Arabic dialect
2. **Collects** qualification data (property type, location, budget, timeline)
3. **Scores** leads based on collected information
4. **Hands off** to human agents when needed
5. **Creates** qualified leads in the CRM

### Key Features

- Saudi Arabic dialect understanding (Najdi, Hijazi)
- Real estate terminology recognition
- Intelligent state transitions
- Graceful human handoff
- Qualification scoring (0-100)

---

## Qualification State Machine

```
                          ┌─────────────┐
                          │   INITIAL   │
                          └──────┬──────┘
                                 │
                                 ▼
                          ┌─────────────┐
                          │  GREETING   │
                          └──────┬──────┘
                                 │
                     ┌───────────┼───────────┐
                     │           │           │
                     ▼           ▼           ▼
              ┌──────────┐ ┌──────────┐ ┌──────────┐
              │ ASK_NAME │ │ASK_PROP  │ │ASK_BUDGET│
              └────┬─────┘ │  _TYPE   │ └────┬─────┘
                   │       └────┬─────┘      │
                   │            │            │
                   └────────────┼────────────┘
                                │
                                ▼
                          ┌───────────┐
                          │ASK_LOCATION│
                          └─────┬─────┘
                                │
                                ▼
                          ┌───────────┐
                          │ASK_TIMELINE│
                          └─────┬─────┘
                                │
                                ▼
                          ┌───────────┐
                          │ASK_FINANCING│
                          └─────┬─────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
             ┌───────────┐           ┌───────────┐
             │ QUALIFIED │           │OFFER_APPT │
             └─────┬─────┘           └─────┬─────┘
                   │                       │
                   │                       ▼
                   │                ┌───────────┐
                   │                │SCHEDULE_  │
                   │                │   APPT    │
                   │                └─────┬─────┘
                   │                      │
                   └──────────┬───────────┘
                              │
                              ▼
                        ┌───────────┐
                        │  CLOSED   │
                        └───────────┘

                    ┌───────────────────┐
                    │   HUMAN_HANDOFF   │◀── (Any state can transition here)
                    └───────────────────┘
```

---

## State Descriptions

### INITIAL
- **Purpose**: Starting state for new conversations
- **Trigger**: First message from new contact
- **Action**: Send greeting, transition to GREETING

### GREETING
- **Purpose**: Welcome user and understand intent
- **Prompt**: "مرحباً! أنا مساعدك الآلي من صداح. كيف يمكنني مساعدتك؟"
- **Transitions**: Based on user response, to ASK_NAME or ASK_PROPERTY_TYPE

### ASK_NAME
- **Purpose**: Collect contact name
- **Prompt**: "ممكن أعرف اسمك الكريم؟"
- **Data Collected**: `name`
- **Score Impact**: +10 points

### ASK_PROPERTY_TYPE
- **Purpose**: Understand what property type they're looking for
- **Prompt**: "ما نوع العقار اللي تبحث عنه؟ فيلا، شقة، أرض، أو نوع آخر؟"
- **Data Collected**: `propertyType`
- **Recognized Values**:
  - فيلا (villa)
  - شقة (apartment)
  - أرض (land)
  - دوبلكس (duplex)
  - تاون هاوس (townhouse)
- **Score Impact**: +15 points

### ASK_LOCATION
- **Purpose**: Determine preferred area/neighborhood
- **Prompt**: "في أي منطقة أو حي تفضل؟"
- **Data Collected**: `location.city`, `location.neighborhood`
- **Recognized Areas**: الرياض، جدة، الدمام، مكة، المدينة, etc.
- **Score Impact**: +15 points

### ASK_BUDGET
- **Purpose**: Understand budget range
- **Prompt**: "كم ميزانيتك التقريبية؟"
- **Data Collected**: `budget.min`, `budget.max`, `budget.currency`
- **Parsing**: Handles Arabic numerals, SAR/ريال, ranges
- **Score Impact**: +20 points

### ASK_TIMELINE
- **Purpose**: Determine purchase timeline
- **Prompt**: "متى تخطط للشراء تقريباً؟"
- **Data Collected**: `timeline`
- **Recognized Values**:
  - فوري / الآن (immediate)
  - خلال شهر (within month)
  - خلال 3 شهور (within 3 months)
  - خلال 6 شهور (within 6 months)
  - سنة (within year)
- **Score Impact**: +10 points (higher for shorter timelines)

### ASK_FINANCING
- **Purpose**: Determine if financing is needed
- **Prompt**: "هل تحتاج تمويل عقاري؟"
- **Data Collected**: `needsFinancing`
- **Score Impact**: +5 points

### QUALIFIED
- **Purpose**: Lead has provided sufficient information
- **Trigger**: All required fields collected, score >= threshold
- **Action**: Create/update Lead in CRM, offer appointment

### OFFER_APPOINTMENT
- **Purpose**: Offer to schedule a meeting
- **Prompt**: "ممتاز! هل تحب أحجز لك موعد مع أحد مستشارينا العقاريين؟"
- **Score Impact**: +15 points if accepted

### SCHEDULE_APPOINTMENT
- **Purpose**: Collect appointment preferences
- **Prompt**: "متى يناسبك موعد للمقابلة؟"
- **Data Collected**: `appointmentDate`, `appointmentTime`

### HUMAN_HANDOFF
- **Purpose**: Transfer to human agent
- **Triggers**: Handoff keywords, complex queries, explicit request
- **Action**: Change conversation status to `pending`, notify agents

### CLOSED
- **Purpose**: Conversation ended
- **Action**: Archive conversation, final lead update

---

## Sample Conversation Flow

### Scenario: Villa in Riyadh

```
عميل: السلام عليكم
بوت: وعليكم السلام ورحمة الله! مرحباً بك في صداح العقارية. كيف أقدر أساعدك اليوم؟

عميل: أبي فيلا بالرياض
بوت: ممتاز! تبحث عن فيلا في الرياض. ممكن أعرف اسمك الكريم؟

عميل: أحمد العتيبي
بوت: أهلاً يا أحمد! في أي حي بالرياض تفضل؟

عميل: حي الياسمين أو النرجس
بوت: اختيار ممتاز! حي الياسمين والنرجس من أفضل الأحياء. كم ميزانيتك التقريبية؟

عميل: حوالي مليونين ريال
بوت: تمام. ميزانية مليونين ريال مناسبة لفلل هذي الأحياء. متى تخطط للشراء تقريباً؟

عميل: خلال 3 شهور إن شاء الله
بوت: ممتاز يا أحمد! هل تحتاج تمويل عقاري؟

عميل: لا عندي كاش
بوت: ممتاز! جمعت كل المعلومات. هل تحب أحجز لك موعد مع أحد مستشارينا المتخصصين في فلل شمال الرياض؟

عميل: أيوه تمام
بوت: متى يناسبك الموعد؟ صباحاً أو مساءً؟

عميل: مساء يوم الأحد
بوت: تم حجز موعدك يوم الأحد مساءً. سيتواصل معك أحد مستشارينا لتأكيد الموعد. شكراً لك يا أحمد!
```

### Qualification Data Collected

```json
{
  "state": "SCHEDULE_APPOINTMENT",
  "name": "أحمد العتيبي",
  "propertyType": "villa",
  "location": {
    "city": "الرياض",
    "neighborhoods": ["الياسمين", "النرجس"]
  },
  "budget": {
    "min": 1800000,
    "max": 2200000,
    "currency": "SAR"
  },
  "timeline": "within_3_months",
  "needsFinancing": false,
  "qualificationScore": 95,
  "qualifiedAt": "2024-01-15T10:30:00Z"
}
```

---

## Customizing Prompts

### Prompt Templates Location

```
src/modules/ai/prompts/
├── system-prompt.ts      # Main system prompt
├── state-prompts.ts      # State-specific prompts
└── few-shot-examples.ts  # Example conversations
```

### System Prompt

The system prompt defines the bot's personality and instructions:

```typescript
// src/modules/ai/prompts/system-prompt.ts
export const SYSTEM_PROMPT = `
أنت مساعد آلي ذكي لشركة صداح العقارية في المملكة العربية السعودية.

## شخصيتك
- ودود ومحترف
- تتحدث باللهجة السعودية (نجدي/حجازي)
- متخصص في العقارات السعودية

## هدفك
- تأهيل العملاء المحتملين
- جمع معلومات: نوع العقار، الموقع، الميزانية، الجدول الزمني
- تقديم تجربة ممتازة للعميل

## قواعد مهمة
- لا تذكر أنك ذكاء اصطناعي
- كن مختصراً ومفيداً
- حول للموظف إذا طلب العميل ذلك
`;
```

### State-Specific Prompts

```typescript
// src/modules/ai/prompts/state-prompts.ts
export const STATE_PROMPTS: Record<QualificationState, string> = {
  [QualificationState.ASK_NAME]: `
    اطلب اسم العميل بأدب. مثال:
    "ممكن أعرف اسمك الكريم؟"
  `,
  [QualificationState.ASK_PROPERTY_TYPE]: `
    اسأل عن نوع العقار المطلوب. مثال:
    "ما نوع العقار اللي تبحث عنه؟ فيلا، شقة، أرض؟"
  `,
  // ... more states
};
```

### Customization Tips

1. **Dialect**: Adjust greetings for regional dialects
2. **Tone**: Formal vs casual based on brand
3. **Questions**: Add property-specific questions (size, bedrooms)
4. **Follow-ups**: Add clarifying questions

---

## Adding New States

### Step 1: Define State

```typescript
// src/modules/ai/state-machine/states.ts
export enum QualificationState {
  // ... existing states
  ASK_BEDROOMS = 'ask_bedrooms',  // New state
}
```

### Step 2: Update QualificationData

```typescript
export interface QualificationData {
  // ... existing fields
  bedrooms?: number;  // New field
}
```

### Step 3: Add Transition Rules

```typescript
// src/modules/ai/state-machine/transitions.ts
export const STATE_TRANSITIONS: StateTransitionMap = {
  // ... existing transitions
  [QualificationState.ASK_PROPERTY_TYPE]: {
    next: QualificationState.ASK_BEDROOMS,  // New transition
    conditions: [
      { field: 'propertyType', value: 'villa' },
      { field: 'propertyType', value: 'apartment' },
    ],
  },
  [QualificationState.ASK_BEDROOMS]: {
    next: QualificationState.ASK_LOCATION,
  },
};
```

### Step 4: Add Prompt

```typescript
// src/modules/ai/prompts/state-prompts.ts
export const STATE_PROMPTS = {
  // ... existing prompts
  [QualificationState.ASK_BEDROOMS]: `
    اسأل عن عدد الغرف المطلوبة. مثال:
    "كم عدد غرف النوم اللي تحتاجها؟"
  `,
};
```

### Step 5: Add Entity Extraction

```typescript
// src/modules/ai/dialect/real-estate-terms.ts
export const BEDROOM_PATTERNS = [
  /(\d+)\s*(غرف|غرفة)/,
  /(\d+)\s*bedrooms?/i,
];
```

---

## Handoff Triggers

### Keyword-Based Handoff

```typescript
// Configured via environment
WHATSAPP_HANDOFF_KEYWORDS=مساعدة,موظف,بشري,help,agent,human
```

### Condition-Based Handoff

The state machine triggers handoff when:

1. **Explicit Request**: User says "أبي أكلم موظف"
2. **Repeated Confusion**: Bot can't understand after 3 attempts
3. **Sensitive Topics**: Complaints, legal questions
4. **Complex Queries**: Multi-property, investment questions
5. **High-Value Lead**: Budget > threshold

### Handoff Process

```typescript
// When handoff triggers:
1. Update conversation.status = 'pending'
2. Send handoff message to user
3. Emit HANDOFF_TRIGGERED event
4. Notify agents via WebSocket
5. Create notification for assigned team
```

---

## Qualification Scoring

### Scoring Formula

```typescript
const calculateScore = (data: QualificationData): number => {
  let score = 0;

  // Name: +10
  if (data.name) score += 10;

  // Property Type: +15
  if (data.propertyType) score += 15;

  // Location: +15
  if (data.location?.city) score += 15;

  // Budget: +20
  if (data.budget?.max) score += 20;

  // Timeline: +10-20 (based on urgency)
  if (data.timeline === 'immediate') score += 20;
  else if (data.timeline === 'within_month') score += 15;
  else if (data.timeline === 'within_3_months') score += 10;
  else if (data.timeline) score += 5;

  // Financing: +5
  if (data.needsFinancing !== undefined) score += 5;

  // Appointment: +15
  if (data.appointmentScheduled) score += 15;

  return Math.min(score, 100);
};
```

### Score Thresholds

| Score | Status | Action |
|-------|--------|--------|
| 0-30 | Cold | Continue qualification |
| 31-60 | Warm | Priority follow-up |
| 61-80 | Hot | Offer appointment |
| 81-100 | Qualified | Create lead, schedule meeting |

---

## Related Documentation

- [WhatsApp Integration Guide](./whatsapp-integration.md)
- [Troubleshooting Guide](./whatsapp-troubleshooting.md)
