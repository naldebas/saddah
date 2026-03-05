import { useState } from 'react';
import {
  Sparkles,
  Clock,
  ArrowRight,
  FileText,
  Star,
  RefreshCw,
  MessageSquare,
  CreditCard,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Badge } from '@/components/ui';
import {
  RecommendationPriority,
  type LeadRecommendation,
} from '@/services/leads.api';

export type { LeadRecommendation };

interface LeadRecommendationsProps {
  recommendations: LeadRecommendation[];
}

const iconMap: Record<string, React.ElementType> = {
  clock: Clock,
  'arrow-right': ArrowRight,
  'file-text': FileText,
  star: Star,
  'refresh-cw': RefreshCw,
  'message-square': MessageSquare,
  'credit-card': CreditCard,
  'alert-triangle': AlertTriangle,
  'alert-circle': AlertCircle,
  'help-circle': HelpCircle,
};

const priorityColors: Record<RecommendationPriority, string> = {
  [RecommendationPriority.HIGH]: 'bg-red-100 text-red-700 border-red-200',
  [RecommendationPriority.MEDIUM]: 'bg-orange-100 text-orange-700 border-orange-200',
  [RecommendationPriority.LOW]: 'bg-blue-100 text-blue-700 border-blue-200',
};

const priorityLabels: Record<RecommendationPriority, string> = {
  [RecommendationPriority.HIGH]: 'عالية',
  [RecommendationPriority.MEDIUM]: 'متوسطة',
  [RecommendationPriority.LOW]: 'منخفضة',
};

const priorityIconColors: Record<RecommendationPriority, string> = {
  [RecommendationPriority.HIGH]: 'text-red-500',
  [RecommendationPriority.MEDIUM]: 'text-orange-500',
  [RecommendationPriority.LOW]: 'text-blue-500',
};

function RecommendationCard({ recommendation }: { recommendation: LeadRecommendation }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const IconComponent = iconMap[recommendation.icon] || Sparkles;
  const hasActions = recommendation.actions && recommendation.actions.length > 0;

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg bg-gray-50 ${priorityIconColors[recommendation.priority]}`}>
          <IconComponent className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-gray-900">{recommendation.title}</h4>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityColors[recommendation.priority]}`}>
              {priorityLabels[recommendation.priority]}
            </span>
          </div>

          <p className="text-sm text-gray-600 mb-2">{recommendation.description}</p>

          <p className="text-xs text-gray-500 mb-2">
            <span className="font-medium">السبب:</span> {recommendation.reason}
          </p>

          {hasActions && (
            <>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    إخفاء الإجراءات
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    عرض الإجراءات ({recommendation.actions.length})
                  </>
                )}
              </button>

              {isExpanded && (
                <ul className="mt-2 space-y-1 pe-4">
                  {recommendation.actions.map((action, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-primary-500 mt-1">•</span>
                      {action}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function LeadRecommendations({ recommendations }: LeadRecommendationsProps) {
  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  // Group recommendations by priority
  const highPriority = recommendations.filter(r => r.priority === RecommendationPriority.HIGH);
  const mediumPriority = recommendations.filter(r => r.priority === RecommendationPriority.MEDIUM);
  const lowPriority = recommendations.filter(r => r.priority === RecommendationPriority.LOW);

  return (
    <div className="space-y-4">
      {/* Summary badges */}
      <div className="flex flex-wrap gap-2">
        {highPriority.length > 0 && (
          <Badge variant="error" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {highPriority.length} توصية عالية الأولوية
          </Badge>
        )}
        {mediumPriority.length > 0 && (
          <Badge variant="warning" className="flex items-center gap-1">
            {mediumPriority.length} توصية متوسطة
          </Badge>
        )}
        {lowPriority.length > 0 && (
          <Badge variant="primary" className="flex items-center gap-1">
            {lowPriority.length} نصيحة
          </Badge>
        )}
      </div>

      {/* Recommendation cards */}
      <div className="space-y-3">
        {recommendations.map((recommendation, index) => (
          <RecommendationCard key={`${recommendation.type}-${index}`} recommendation={recommendation} />
        ))}
      </div>
    </div>
  );
}
