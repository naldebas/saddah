import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import {
  Plus,
  MoreVertical,
  User,
  Building2,
  Calendar,
  GripVertical,
  Settings,
} from 'lucide-react';
import { Button, Badge, Avatar, Spinner, Select } from '@/components/ui';
import {
  dealsApi,
  pipelinesApi,
  type Deal,
  type Pipeline,
  type KanbanResponse,
} from '@/services/deals.api';
import { CreateDealModal } from './CreateDealModal';
import { DealDetailModal } from './DealDetailModal';

interface StageMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onManageStages: () => void;
}

function StageMenu({ isOpen, onClose, onManageStages }: StageMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="absolute end-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
    >
      <button
        onClick={() => {
          onManageStages();
          onClose();
        }}
        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
      >
        <Settings className="h-4 w-4" />
        <span>إدارة المراحل</span>
      </button>
    </div>
  );
}

interface KanbanColumnProps {
  stage: KanbanResponse['stages'][0];
  pipelineId: string;
  onDealClick: (deal: Deal) => void;
  onAddDeal: (stageId: string) => void;
  onDragStart: (deal: Deal, stageId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (stageId: string) => void;
  onManageStages: () => void;
}

function KanbanColumn({
  stage,
  onDealClick,
  onAddDeal,
  onDragStart,
  onDragOver,
  onDrop,
  onManageStages,
}: KanbanColumnProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div
      className="flex-shrink-0 w-80 flex flex-col bg-gray-50 rounded-xl"
      onDragOver={onDragOver}
      onDrop={() => onDrop(stage.id)}
    >
      {/* Column Header */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: stage.color }}
            />
            <h3 className="font-semibold text-gray-900">{stage.name}</h3>
            <span className="text-sm text-gray-500">({stage.count})</span>
          </div>
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1 hover:bg-gray-200 rounded"
            >
              <MoreVertical className="h-4 w-4 text-gray-500" />
            </button>
            <StageMenu
              isOpen={isMenuOpen}
              onClose={() => setIsMenuOpen(false)}
              onManageStages={onManageStages}
            />
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-1 ltr-nums">
          {stage.totalValue.toLocaleString('ar-SA')} ر.س
        </p>
      </div>

      {/* Cards */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[200px]">
        {stage.deals.map((deal) => (
          <div
            key={deal.id}
            draggable
            onDragStart={() => onDragStart(deal, stage.id)}
            onClick={() => onDealClick(deal)}
            className="bg-white rounded-lg border border-gray-200 p-3 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 truncate">
                  {deal.title}
                </h4>
                <p className="text-lg font-semibold text-primary-600 mt-1 ltr-nums">
                  {Number(deal.value).toLocaleString('ar-SA')} {deal.currency}
                </p>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="h-4 w-4 text-gray-400 cursor-grab" />
              </div>
            </div>

            {/* Contact & Company */}
            <div className="mt-3 space-y-1.5">
              {deal.contact && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="h-3.5 w-3.5" />
                  <span className="truncate">
                    {deal.contact.firstName} {deal.contact.lastName}
                  </span>
                </div>
              )}
              {deal.company && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Building2 className="h-3.5 w-3.5" />
                  <span className="truncate">{deal.company.name}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-3 flex items-center justify-between">
              {deal.owner && (
                <Avatar
                  name={`${deal.owner.firstName} ${deal.owner.lastName}`}
                  size="xs"
                />
              )}
              {deal.expectedCloseDate && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Calendar className="h-3 w-3" />
                  <span className="ltr-nums">
                    {new Date(deal.expectedCloseDate).toLocaleDateString(
                      'ar-SA'
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* Tags */}
            {deal.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {deal.tags.slice(0, 2).map((tag) => (
                  <Badge key={tag} variant="default" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {deal.tags.length > 2 && (
                  <Badge variant="default" className="text-xs">
                    +{deal.tags.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Deal Button */}
      <div className="p-2 border-t border-gray-200">
        <button
          onClick={() => onAddDeal(stage.id)}
          className="w-full p-2 text-sm text-gray-500 hover:bg-gray-200 rounded-lg flex items-center justify-center gap-1 transition-colors"
        >
          <Plus className="h-4 w-4" />
          إضافة صفقة
        </button>
      </div>
    </div>
  );
}

export function DealsKanbanPage() {
  const [kanban, setKanban] = useState<KanbanResponse | null>(null);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [draggedDeal, setDraggedDeal] = useState<{
    deal: Deal;
    fromStageId: string;
  } | null>(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalStageId, setCreateModalStageId] = useState<string | undefined>();
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [isDealDetailOpen, setIsDealDetailOpen] = useState(false);

  // Fetch pipelines
  useEffect(() => {
    const fetchPipelines = async () => {
      try {
        const pipelinesData = await pipelinesApi.getAll();
        setPipelines(pipelinesData);
        // Select default pipeline
        const defaultPipeline = pipelinesData.find((p) => p.isDefault);
        if (defaultPipeline) {
          setSelectedPipeline(defaultPipeline.id);
        } else if (pipelinesData.length > 0) {
          setSelectedPipeline(pipelinesData[0].id);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to fetch pipelines:', error);
        toast.error('فشل في تحميل مسارات المبيعات');
        setIsLoading(false);
      }
    };

    fetchPipelines();
  }, []);

  // Fetch kanban data when pipeline changes
  const fetchKanban = async () => {
    if (!selectedPipeline) return;

    setIsLoading(true);
    try {
      const data = await dealsApi.getKanban(selectedPipeline);
      setKanban(data);
    } catch (error) {
      console.error('Failed to fetch kanban:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKanban();
  }, [selectedPipeline]);

  const handleDealClick = (deal: Deal) => {
    setSelectedDealId(deal.id);
    setIsDealDetailOpen(true);
  };

  const handleAddDeal = (stageId?: string) => {
    setCreateModalStageId(stageId);
    setIsCreateModalOpen(true);
  };

  const handleDealCreated = () => {
    setIsCreateModalOpen(false);
    setCreateModalStageId(undefined);
    fetchKanban();
    toast.success('تم إضافة الصفقة بنجاح');
  };

  const handleDragStart = (deal: Deal, fromStageId: string) => {
    setDraggedDeal({ deal, fromStageId });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (toStageId: string) => {
    if (!draggedDeal || draggedDeal.fromStageId === toStageId) {
      setDraggedDeal(null);
      return;
    }

    try {
      await dealsApi.move(draggedDeal.deal.id, { stageId: toStageId });

      // Update local state
      setKanban((prev) => {
        if (!prev) return prev;

        const newStages = prev.stages.map((stage) => {
          if (stage.id === draggedDeal.fromStageId) {
            return {
              ...stage,
              deals: stage.deals.filter((d) => d.id !== draggedDeal.deal.id),
              count: stage.count - 1,
              totalValue: stage.totalValue - Number(draggedDeal.deal.value),
            };
          }
          if (stage.id === toStageId) {
            const updatedDeal = {
              ...draggedDeal.deal,
              stageId: toStageId,
              stage: {
                id: stage.id,
                name: stage.name,
                color: stage.color,
                probability: stage.probability,
              },
            };
            return {
              ...stage,
              deals: [...stage.deals, updatedDeal],
              count: stage.count + 1,
              totalValue: stage.totalValue + Number(draggedDeal.deal.value),
            };
          }
          return stage;
        });

        return { ...prev, stages: newStages };
      });

      toast.success('تم نقل الصفقة بنجاح');
    } catch (error) {
      console.error('Failed to move deal:', error);
      toast.error('فشل في نقل الصفقة');
    } finally {
      setDraggedDeal(null);
    }
  };

  const handleManageStages = () => {
    // Navigate to pipelines page to manage stages
    window.location.href = '/pipelines';
  };

  // Calculate totals
  const totalDeals = kanban?.stages.reduce((sum, s) => sum + s.count, 0) || 0;
  const totalValue =
    kanban?.stages.reduce((sum, s) => sum + s.totalValue, 0) || 0;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">الصفقات</h1>
            <p className="text-gray-600 mt-1">
              {totalDeals} صفقة • {totalValue.toLocaleString('ar-SA')} ر.س
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Select
              value={selectedPipeline}
              onChange={(e) => setSelectedPipeline(e.target.value)}
              className="w-48"
            >
              {pipelines.map((pipeline) => (
                <option key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                </option>
              ))}
            </Select>
            <Button onClick={() => handleAddDeal()}>
              <Plus className="h-4 w-4" />
              صفقة جديدة
            </Button>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : kanban ? (
        <div className="flex-1 overflow-x-auto p-6">
          <div className="flex gap-4 h-full">
            {kanban.stages
              .sort((a, b) => a.order - b.order)
              .map((stage) => (
                <KanbanColumn
                  key={stage.id}
                  stage={stage}
                  pipelineId={selectedPipeline}
                  onDealClick={handleDealClick}
                  onAddDeal={handleAddDeal}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onManageStages={handleManageStages}
                />
              ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">لم يتم العثور على مسار مبيعات</p>
        </div>
      )}

      {/* Create Deal Modal */}
      <CreateDealModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setCreateModalStageId(undefined);
        }}
        onSuccess={handleDealCreated}
        defaultPipelineId={selectedPipeline}
        defaultStageId={createModalStageId}
      />

      {/* Deal Detail Modal */}
      <DealDetailModal
        isOpen={isDealDetailOpen}
        onClose={() => {
          setIsDealDetailOpen(false);
          setSelectedDealId(null);
        }}
        dealId={selectedDealId}
        onDealUpdated={fetchKanban}
      />
    </div>
  );
}
