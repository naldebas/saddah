import { Injectable } from '@nestjs/common';
import {
  RecommendationType,
  RecommendationPriority,
  LeadRecommendation,
} from './interfaces/recommendation.interface';

import { Decimal } from '@prisma/client/runtime/library';

interface LeadData {
  id: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  source: string;
  propertyType?: string | null;
  budget?: number | bigint | Decimal | null;
  timeline?: string | null;
  location?: string | null;
  financingNeeded?: boolean | null;
  status: string;
  score?: number | null;
  scoreGrade?: string | null;
  createdAt: Date;
  updatedAt: Date;
  scoreHistory?: Array<{
    score: number;
    grade: string;
    createdAt: Date;
  }>;
}

@Injectable()
export class LeadRecommendationsService {
  /**
   * Generate AI recommendations for a lead
   */
  generateRecommendations(lead: LeadData): LeadRecommendation[] {
    const recommendations: LeadRecommendation[] = [];

    // Check each recommendation rule
    this.checkFollowUpNeeded(lead, recommendations);
    this.checkReadyToConvert(lead, recommendations);
    this.checkMissingInfo(lead, recommendations);
    this.checkHighPriority(lead, recommendations);
    this.checkReEngagement(lead, recommendations);
    this.addContactTimeRecommendation(lead, recommendations);
    this.addTalkingPoints(lead, recommendations);
    this.addFinancingGuidance(lead, recommendations);
    this.checkRiskAlerts(lead, recommendations);

    // Sort by priority
    return this.sortByPriority(recommendations);
  }

  /**
   * Check if lead needs follow-up
   * If status = 'qualified' AND updatedAt > 3 days ago
   */
  private checkFollowUpNeeded(
    lead: LeadData,
    recommendations: LeadRecommendation[],
  ): void {
    if (lead.status !== 'qualified') return;

    const daysSinceUpdate = this.daysSince(lead.updatedAt);
    if (daysSinceUpdate >= 3) {
      recommendations.push({
        type: RecommendationType.FOLLOW_UP,
        priority: RecommendationPriority.HIGH,
        title: 'متابعة مطلوبة',
        description: `مرت ${daysSinceUpdate} أيام منذ آخر تحديث على هذا العميل المؤهل`,
        reason: 'العملاء المؤهلون يحتاجون متابعة مستمرة للحفاظ على اهتمامهم',
        actions: [
          'اتصل بالعميل للاطمئنان على اهتمامه',
          'استفسر عن أي تطورات في متطلباته',
          'حدث حالة العميل بعد التواصل',
        ],
        icon: 'clock',
      });
    }
  }

  /**
   * Check if lead is ready to convert
   * If score >= 70 AND status != 'converted'
   */
  private checkReadyToConvert(
    lead: LeadData,
    recommendations: LeadRecommendation[],
  ): void {
    if (lead.status === 'converted' || lead.status === 'lost') return;

    const score = lead.score ?? 0;
    if (score >= 70) {
      recommendations.push({
        type: RecommendationType.CONVERT,
        priority: RecommendationPriority.HIGH,
        title: 'جاهز للتحويل',
        description: `تقييم العميل ${score} - مستوى عالي من الاستعداد للشراء`,
        reason: 'العملاء ذوو التقييم العالي لديهم احتمالية أعلى للتحويل',
        actions: [
          'قم بتحويل العميل إلى جهة اتصال وصفقة',
          'حدد موعد لعرض العقارات المناسبة',
          'جهز عرض سعر مبدئي',
        ],
        icon: 'arrow-right',
      });
    }
  }

  /**
   * Check for missing important information
   */
  private checkMissingInfo(
    lead: LeadData,
    recommendations: LeadRecommendation[],
  ): void {
    const missingFields: string[] = [];

    if (!lead.email && !lead.phone) {
      missingFields.push('معلومات الاتصال (بريد إلكتروني أو هاتف)');
    }

    if (
      (lead.status === 'qualified' || lead.status === 'contacted') &&
      !lead.budget
    ) {
      missingFields.push('الميزانية');
    }

    if (!lead.propertyType) {
      missingFields.push('نوع العقار المطلوب');
    }

    if (!lead.timeline) {
      missingFields.push('الإطار الزمني للشراء');
    }

    if (missingFields.length > 0) {
      recommendations.push({
        type: RecommendationType.GATHER_INFO,
        priority: RecommendationPriority.MEDIUM,
        title: 'معلومات ناقصة',
        description: `ينقص العميل: ${missingFields.join('، ')}`,
        reason: 'المعلومات الكاملة تساعد في تقديم خدمة أفضل وتقييم أدق',
        actions: [
          'اسأل العميل عن المعلومات الناقصة في التواصل القادم',
          'حدث بيانات العميل بعد الحصول على المعلومات',
        ],
        icon: 'file-text',
      });
    }
  }

  /**
   * Check if lead is high priority based on budget/timeline
   */
  private checkHighPriority(
    lead: LeadData,
    recommendations: LeadRecommendation[],
  ): void {
    if (lead.status === 'converted' || lead.status === 'lost') return;

    const budget = lead.budget ? Number(lead.budget) : 0;
    const isHighBudget = budget >= 2000000;
    const isUrgentTimeline =
      lead.timeline === 'immediate' || lead.timeline === '1_month';

    if (isHighBudget || isUrgentTimeline) {
      const reasons: string[] = [];
      if (isHighBudget) {
        reasons.push(`ميزانية عالية (${budget.toLocaleString()} ر.س)`);
      }
      if (isUrgentTimeline) {
        reasons.push(
          lead.timeline === 'immediate' ? 'يريد الشراء فوراً' : 'يريد الشراء خلال شهر',
        );
      }

      recommendations.push({
        type: RecommendationType.HIGH_PRIORITY,
        priority: RecommendationPriority.HIGH,
        title: 'أولوية عالية',
        description: reasons.join(' - '),
        reason: 'العملاء ذوو الميزانية العالية والوقت القصير يحتاجون اهتماماً فورياً',
        actions: [
          'أعطِ هذا العميل الأولوية في التواصل',
          'جهز قائمة بأفضل العقارات المتاحة',
          'رتب موعد عرض في أقرب وقت',
        ],
        icon: 'star',
      });
    }
  }

  /**
   * Check if lead needs re-engagement
   * If updatedAt > 7 days AND status = 'contacted'
   */
  private checkReEngagement(
    lead: LeadData,
    recommendations: LeadRecommendation[],
  ): void {
    if (lead.status !== 'contacted') return;

    const daysSinceUpdate = this.daysSince(lead.updatedAt);
    if (daysSinceUpdate >= 7) {
      recommendations.push({
        type: RecommendationType.RE_ENGAGE,
        priority: RecommendationPriority.MEDIUM,
        title: 'إعادة التفاعل',
        description: `مرت ${daysSinceUpdate} أيام منذ آخر تواصل - العميل قد يفقد الاهتمام`,
        reason: 'التأخر في المتابعة قد يؤدي لخسارة العميل',
        actions: [
          'تواصل مع العميل لتذكيره بخدماتك',
          'اعرض عليه عقارات جديدة قد تناسبه',
          'استفسر إذا كانت متطلباته تغيرت',
        ],
        icon: 'refresh-cw',
      });
    }
  }

  /**
   * Add contact time recommendation
   */
  private addContactTimeRecommendation(
    lead: LeadData,
    recommendations: LeadRecommendation[],
  ): void {
    if (lead.status === 'converted' || lead.status === 'lost') return;

    const contactSuggestion = this.getOptimalContactTime(lead);

    recommendations.push({
      type: RecommendationType.CONTACT_TIME,
      priority: RecommendationPriority.LOW,
      title: 'أفضل وقت للتواصل',
      description: contactSuggestion,
      reason: 'اختيار الوقت والقناة المناسبة يزيد من احتمالية الرد',
      actions: [],
      icon: 'clock',
    });
  }

  /**
   * Get optimal contact time suggestion
   */
  private getOptimalContactTime(lead: LeadData): string {
    const hour = new Date().getHours();
    const isBusinessHours = hour >= 9 && hour < 17;

    if (lead.source === 'whatsapp_bot') {
      return 'تواصل عبر واتساب - العميل يفضل هذه القناة';
    }

    if (!isBusinessHours) {
      return 'أفضل وقت للتواصل: 9 صباحاً - 5 مساءً';
    }

    return 'الآن وقت مناسب للتواصل';
  }

  /**
   * Add talking points recommendation
   */
  private addTalkingPoints(
    lead: LeadData,
    recommendations: LeadRecommendation[],
  ): void {
    if (lead.status === 'converted' || lead.status === 'lost') return;

    const talkingPoints = this.generateTalkingPoints(lead);

    if (talkingPoints.length > 0) {
      recommendations.push({
        type: RecommendationType.TALKING_POINTS,
        priority: RecommendationPriority.LOW,
        title: 'نقاط الحديث',
        description: 'مواضيع مقترحة للنقاش مع العميل',
        reason: 'التحضير المسبق يساعد في تقديم تجربة أفضل للعميل',
        actions: talkingPoints,
        icon: 'message-square',
      });
    }
  }

  /**
   * Generate talking points based on lead profile
   */
  private generateTalkingPoints(lead: LeadData): string[] {
    const points: string[] = [];

    if (lead.propertyType === 'villa') {
      points.push('ناقش مميزات الفلل في المنطقة المطلوبة');
    } else if (lead.propertyType === 'apartment') {
      points.push('اعرض الشقق المتاحة والخدمات المشتركة');
    } else if (lead.propertyType === 'land') {
      points.push('ناقش إمكانيات البناء والتطوير');
    } else if (lead.propertyType === 'commercial') {
      points.push('استفسر عن طبيعة النشاط التجاري المطلوب');
    }

    const budget = lead.budget ? Number(lead.budget) : 0;
    if (budget >= 2000000) {
      points.push('اعرض العقارات الفاخرة والمميزة');
    }

    if (lead.financingNeeded) {
      points.push('قدم خيارات التمويل العقاري المتاحة');
      points.push('اذكر نسب الفائدة الحالية من البنوك الشريكة');
    }

    if (lead.timeline === 'immediate') {
      points.push('العميل مستعجل - ركز على العقارات الجاهزة للتسليم');
    } else if (lead.timeline === '1_month') {
      points.push('جهز قائمة بالعقارات المتاحة للتسليم السريع');
    }

    if (lead.location) {
      points.push(`ركز على العقارات في منطقة ${lead.location}`);
    }

    return points;
  }

  /**
   * Add financing guidance if needed
   */
  private addFinancingGuidance(
    lead: LeadData,
    recommendations: LeadRecommendation[],
  ): void {
    if (!lead.financingNeeded) return;
    if (lead.status === 'converted' || lead.status === 'lost') return;

    recommendations.push({
      type: RecommendationType.FINANCING,
      priority: RecommendationPriority.MEDIUM,
      title: 'تمويل عقاري',
      description: 'العميل يحتاج تمويل - ساعده في فهم الخيارات المتاحة',
      reason: 'التوجيه في التمويل يسرع عملية الشراء',
      actions: [
        'اشرح خطوات الحصول على التمويل العقاري',
        'وفر معلومات عن البنوك الشريكة ونسب الفائدة',
        'ساعد في حساب القسط الشهري التقريبي',
        'وضح المستندات المطلوبة للتمويل',
      ],
      icon: 'credit-card',
    });
  }

  /**
   * Check for risk alerts
   */
  private checkRiskAlerts(
    lead: LeadData,
    recommendations: LeadRecommendation[],
  ): void {
    const risks = this.assessRisks(lead);
    recommendations.push(...risks);
  }

  /**
   * Assess risks for the lead
   */
  private assessRisks(lead: LeadData): LeadRecommendation[] {
    const risks: LeadRecommendation[] = [];

    // Check for score decline
    if (lead.scoreHistory && lead.scoreHistory.length > 1) {
      const [latest, previous] = lead.scoreHistory;
      if (latest.score < previous.score) {
        risks.push({
          type: RecommendationType.RISK_ALERT,
          priority: RecommendationPriority.HIGH,
          title: 'انخفاض في التقييم',
          description: `انخفض تقييم العميل من ${previous.score} إلى ${latest.score}`,
          reason: 'قد يشير إلى فقدان الاهتمام',
          actions: ['تواصل فوري مع العميل', 'اسأل عن أي مخاوف أو تغييرات'],
          icon: 'alert-triangle',
        });
      }
    }

    // Check for stale new lead
    const daysSinceCreation = this.daysSince(lead.createdAt);
    if (lead.status === 'new' && daysSinceCreation > 5) {
      risks.push({
        type: RecommendationType.RISK_ALERT,
        priority: RecommendationPriority.HIGH,
        title: 'عميل جديد بدون تواصل',
        description: `مرت ${daysSinceCreation} أيام بدون أي تواصل`,
        reason: 'العملاء الجدد يحتاجون تواصل سريع للحفاظ على اهتمامهم',
        actions: ['اتصل بالعميل اليوم', 'حدث الحالة بعد التواصل'],
        icon: 'alert-circle',
      });
    }

    // Check for unqualified status with high score
    if (lead.status === 'unqualified' && (lead.score ?? 0) >= 50) {
      risks.push({
        type: RecommendationType.RISK_ALERT,
        priority: RecommendationPriority.MEDIUM,
        title: 'مراجعة التأهيل',
        description: `العميل مصنف كغير مؤهل لكن تقييمه ${lead.score}`,
        reason: 'قد يكون هناك خطأ في التصنيف',
        actions: ['راجع سبب عدم التأهيل', 'أعد تقييم العميل إذا لزم'],
        icon: 'help-circle',
      });
    }

    return risks;
  }

  /**
   * Calculate days since a date
   */
  private daysSince(date: Date): number {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Sort recommendations by priority
   */
  private sortByPriority(
    recommendations: LeadRecommendation[],
  ): LeadRecommendation[] {
    const priorityOrder = {
      [RecommendationPriority.HIGH]: 0,
      [RecommendationPriority.MEDIUM]: 1,
      [RecommendationPriority.LOW]: 2,
    };

    return recommendations.sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
    );
  }
}
