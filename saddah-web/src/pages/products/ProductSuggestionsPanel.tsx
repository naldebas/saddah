import { Home, Building2, MapPin, ThumbsUp, ThumbsDown, Eye, ChevronRight } from 'lucide-react';
import { Button, Card, Spinner } from '@/components/ui';
import { Badge } from '@/components/ui/Badge';
import { useProductSuggestions, useUpdateSuggestionStatus } from '@/hooks';
import type { LeadProductSuggestion } from '@/services/products.api';

interface ProductSuggestionsPanelProps {
  leadId: string;
  onCreateDeal?: (productId: string) => void;
}

const statusColors: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  available: 'success',
  reserved: 'warning',
  sold: 'error',
};

const statusLabels: Record<string, string> = {
  available: 'متاحة',
  reserved: 'محجوزة',
  sold: 'مباعة',
};

const typeLabels: Record<string, string> = {
  villa: 'فيلا',
  apartment: 'شقة',
  townhouse: 'تاون هاوس',
  floor: 'دور',
  land: 'أرض',
  office: 'مكتب',
  shop: 'محل',
};

const suggestionStatusColors: Record<string, string> = {
  suggested: 'bg-blue-100 text-blue-800',
  viewed: 'bg-gray-100 text-gray-800',
  interested: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

const suggestionStatusLabels: Record<string, string> = {
  suggested: 'مقترح',
  viewed: 'تم العرض',
  interested: 'مهتم',
  rejected: 'مرفوض',
};

export function ProductSuggestionsPanel({ leadId, onCreateDeal }: ProductSuggestionsPanelProps) {
  const { data: suggestions, isLoading } = useProductSuggestions(leadId);
  const updateStatus = useUpdateSuggestionStatus();

  const handleMarkViewed = async (suggestion: LeadProductSuggestion) => {
    if (suggestion.status === 'suggested') {
      await updateStatus.mutateAsync({
        leadId,
        productId: suggestion.productId,
        status: 'viewed',
      });
    }
  };

  const handleMarkInterested = async (suggestion: LeadProductSuggestion) => {
    await updateStatus.mutateAsync({
      leadId,
      productId: suggestion.productId,
      status: 'interested',
    });
  };

  const handleMarkRejected = async (suggestion: LeadProductSuggestion) => {
    await updateStatus.mutateAsync({
      leadId,
      productId: suggestion.productId,
      status: 'rejected',
    });
  };

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      </Card>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return (
      <Card className="p-4">
        <div className="text-center py-6">
          <Home className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-gray-900 mb-1">لا توجد اقتراحات</h3>
          <p className="text-xs text-gray-500">
            سيتم اقتراح وحدات مناسبة بناءً على متطلبات العميل
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Home className="w-5 h-5 text-primary-600" />
          اقتراحات مناسبة
          <Badge variant="primary">{suggestions.length}</Badge>
        </h3>
      </div>

      <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className="p-4 hover:bg-gray-50 transition-colors"
            onClick={() => handleMarkViewed(suggestion)}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">
                    {suggestion.product.project?.name} - {suggestion.product.unitNumber}
                  </h4>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {suggestion.product.project?.city}
                    {suggestion.product.project?.district && ` - ${suggestion.product.project.district}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Match Score */}
                <div className="text-center">
                  <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                    suggestion.matchScore >= 80 ? 'bg-green-100 text-green-800' :
                    suggestion.matchScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    تطابق {suggestion.matchScore}%
                  </div>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
              <span>{typeLabels[suggestion.product.type] || suggestion.product.type}</span>
              <span dir="ltr">{suggestion.product.area} م²</span>
              {suggestion.product.bedrooms && <span>{suggestion.product.bedrooms} غرف</span>}
              <span className="font-semibold text-gray-900" dir="ltr">
                {Number(suggestion.product.price).toLocaleString()} {suggestion.product.currency}
              </span>
            </div>

            {/* Match Reasons */}
            {Object.keys(suggestion.matchReason).length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {Object.entries(suggestion.matchReason).map(([key, value]) => (
                  <span
                    key={key}
                    className="px-2 py-0.5 bg-primary-50 text-primary-700 text-xs rounded"
                  >
                    {key === 'propertyType' && 'نوع العقار'}
                    {key === 'city' && 'المدينة'}
                    {key === 'district' && 'الحي'}
                    {key === 'budget' && 'الميزانية'}
                    {key === 'bedrooms' && 'الغرف'}
                    {key === 'area' && 'المساحة'}
                    {!['propertyType', 'city', 'district', 'budget', 'bedrooms', 'area'].includes(key) && key}
                    : +{value}
                  </span>
                ))}
              </div>
            )}

            {/* Status & Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-xs ${suggestionStatusColors[suggestion.status]}`}>
                  {suggestionStatusLabels[suggestion.status]}
                </span>
                <Badge variant={statusColors[suggestion.product.status] || 'default'} className="text-xs">
                  {statusLabels[suggestion.product.status]}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                {suggestion.status !== 'rejected' && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkInterested(suggestion);
                      }}
                      className="text-green-600 hover:bg-green-50"
                      title="مهتم"
                    >
                      <ThumbsUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkRejected(suggestion);
                      }}
                      className="text-red-600 hover:bg-red-50"
                      title="غير مهتم"
                    >
                      <ThumbsDown className="w-4 h-4" />
                    </Button>
                  </>
                )}
                {suggestion.product.status === 'available' && onCreateDeal && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateDeal(suggestion.productId);
                    }}
                  >
                    إنشاء صفقة
                    <ChevronRight className="w-4 h-4 mr-1" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default ProductSuggestionsPanel;
