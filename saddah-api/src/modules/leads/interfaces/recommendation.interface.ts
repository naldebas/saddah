export enum RecommendationType {
  FOLLOW_UP = 'follow_up',
  CONVERT = 'convert',
  GATHER_INFO = 'gather_info',
  HIGH_PRIORITY = 'high_priority',
  RE_ENGAGE = 're_engage',
  CONTACT_TIME = 'contact_time',
  TALKING_POINTS = 'talking_points',
  PROPERTY_MATCH = 'property_match',
  FINANCING = 'financing',
  RISK_ALERT = 'risk_alert',
}

export enum RecommendationPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export interface LeadRecommendation {
  type: RecommendationType;
  priority: RecommendationPriority;
  title: string;
  description: string;
  reason: string;
  actions: string[];
  icon: string;
}
