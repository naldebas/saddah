import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Plus,
  Settings,
  GripVertical,
  Trash2,
  Edit2,
  Check,
  X,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button, Card, Badge, Spinner, ConfirmModal, Modal, ModalFooter, Input } from '@/components/ui';
import { pipelinesApi, Pipeline, PipelineStage, CreatePipelineDto } from '@/services/pipelines.api';

const stageColors = [
  '#6B7280', // gray
  '#3B82F6', // blue
  '#8B5CF6', // purple
  '#F59E0B', // amber
  '#10B981', // green
  '#EF4444', // red
  '#EC4899', // pink
  '#06B6D4', // cyan
];

interface SortableStageItemProps {
  stage: PipelineStage;
  index: number;
  isEditing: boolean;
  editingStageData: { name: string; color: string };
  onEditStart: (stage: PipelineStage) => void;
  onEditSave: (stage: PipelineStage) => void;
  onEditCancel: () => void;
  onEditDataChange: (data: { name: string; color: string }) => void;
  onDeleteConfirm: (stage: PipelineStage) => void;
}

function SortableStageItem({
  stage,
  index,
  isEditing,
  editingStageData,
  onEditStart,
  onEditSave,
  onEditCancel,
  onEditDataChange,
  onDeleteConfirm,
}: SortableStageItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-4 bg-gray-50 rounded-lg group ${
        isDragging ? 'shadow-lg ring-2 ring-primary-500' : ''
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="h-5 w-5 text-gray-400" />
      </div>

      <div
        className="h-4 w-4 rounded-full flex-shrink-0"
        style={{ backgroundColor: stage.color }}
      />

      {isEditing ? (
        <div className="flex-1 flex items-center gap-2">
          <input
            type="text"
            value={editingStageData.name}
            onChange={(e) =>
              onEditDataChange({
                ...editingStageData,
                name: e.target.value,
              })
            }
            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            autoFocus
          />
          <div className="flex gap-1">
            {stageColors.map((color) => (
              <button
                key={color}
                onClick={() =>
                  onEditDataChange({
                    ...editingStageData,
                    color,
                  })
                }
                className={`h-6 w-6 rounded-full border-2 ${
                  editingStageData.color === color
                    ? 'border-gray-900'
                    : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <button
            onClick={() => onEditSave(stage)}
            className="p-1.5 text-green-600 hover:bg-green-100 rounded"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            onClick={onEditCancel}
            className="p-1.5 text-gray-600 hover:bg-gray-200 rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <>
          <div className="flex-1">
            <p className="font-medium text-gray-900">{stage.name}</p>
            <p className="text-sm text-gray-500">
              احتمالية: {stage.probability}% • {stage._count?.deals || 0} صفقة
            </p>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEditStart(stage)}
              className="p-1.5 text-gray-600 hover:bg-gray-200 rounded"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDeleteConfirm(stage)}
              className="p-1.5 text-red-600 hover:bg-red-100 rounded"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </>
      )}

      <span className="text-sm text-gray-400 w-8 text-center">{index + 1}</span>
    </div>
  );
}

export function PipelinesPage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [isAddingStage, setIsAddingStage] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState(stageColors[0]);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editingStageData, setEditingStageData] = useState({ name: '', color: '' });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [stageToDelete, setStageToDelete] = useState<PipelineStage | null>(null);
  const [isCreatePipelineModalOpen, setIsCreatePipelineModalOpen] = useState(false);
  const [isCreatingPipeline, setIsCreatingPipeline] = useState(false);
  const [newPipelineData, setNewPipelineData] = useState<CreatePipelineDto>({
    name: '',
    description: '',
    isDefault: false,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchPipelines = async () => {
    setIsLoading(true);
    try {
      const data = await pipelinesApi.getAll();
      setPipelines(data);
      if (data.length > 0 && !selectedPipeline) {
        setSelectedPipeline(data[0]);
      } else if (selectedPipeline) {
        // Refresh the selected pipeline with new data
        const updated = data.find(p => p.id === selectedPipeline.id);
        if (updated) {
          setSelectedPipeline(updated);
        }
      }
    } catch (error) {
      console.error('Failed to fetch pipelines:', error);
      toast.error('فشل في تحميل المسارات');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPipelines();
  }, []);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !selectedPipeline || active.id === over.id) {
      return;
    }

    const sortedStages = [...selectedPipeline.stages].sort((a, b) => a.order - b.order);
    const oldIndex = sortedStages.findIndex((s) => s.id === active.id);
    const newIndex = sortedStages.findIndex((s) => s.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedStages = arrayMove(sortedStages, oldIndex, newIndex);
    const newStageIds = reorderedStages.map((s) => s.id);

    // Optimistically update the UI
    const updatedStages = reorderedStages.map((stage, index) => ({
      ...stage,
      order: index,
    }));

    setSelectedPipeline({
      ...selectedPipeline,
      stages: updatedStages,
    });

    try {
      await pipelinesApi.reorderStages(selectedPipeline.id, newStageIds);
      toast.success('تم إعادة ترتيب المراحل');
    } catch (error) {
      console.error('Failed to reorder stages:', error);
      toast.error('فشل في إعادة ترتيب المراحل');
      // Revert on error
      fetchPipelines();
    }
  };

  const handleAddStage = async () => {
    if (!selectedPipeline || !newStageName.trim()) return;

    try {
      await pipelinesApi.createStage(selectedPipeline.id, {
        name: newStageName,
        color: newStageColor,
        probability: 50,
      });
      toast.success('تم إضافة المرحلة بنجاح');
      setNewStageName('');
      setNewStageColor(stageColors[0]);
      setIsAddingStage(false);
      fetchPipelines();
    } catch (error) {
      console.error('Failed to add stage:', error);
      toast.error('فشل في إضافة المرحلة');
    }
  };

  const handleEditStage = async (stage: PipelineStage) => {
    if (!selectedPipeline || !editingStageData.name.trim()) return;

    try {
      await pipelinesApi.updateStage(selectedPipeline.id, stage.id, {
        name: editingStageData.name,
        color: editingStageData.color,
      });
      toast.success('تم تحديث المرحلة بنجاح');
      setEditingStageId(null);
      fetchPipelines();
    } catch (error) {
      console.error('Failed to update stage:', error);
      toast.error('فشل في تحديث المرحلة');
    }
  };

  const handleDeleteStage = async () => {
    if (!selectedPipeline || !stageToDelete) return;

    try {
      await pipelinesApi.deleteStage(selectedPipeline.id, stageToDelete.id);
      toast.success('تم حذف المرحلة بنجاح');
      setDeleteModalOpen(false);
      setStageToDelete(null);
      fetchPipelines();
    } catch (error) {
      console.error('Failed to delete stage:', error);
      toast.error('فشل في حذف المرحلة');
    }
  };

  const startEditStage = (stage: PipelineStage) => {
    setEditingStageId(stage.id);
    setEditingStageData({ name: stage.name, color: stage.color });
  };

  const confirmDeleteStage = (stage: PipelineStage) => {
    setStageToDelete(stage);
    setDeleteModalOpen(true);
  };

  const handleCreatePipeline = async () => {
    if (!newPipelineData.name.trim()) {
      toast.error('يجب إدخال اسم المسار');
      return;
    }

    setIsCreatingPipeline(true);
    try {
      const newPipeline = await pipelinesApi.create({
        name: newPipelineData.name,
        description: newPipelineData.description || undefined,
        isDefault: newPipelineData.isDefault,
        stages: [
          { name: 'تواصل أولي', color: '#3B82F6', probability: 10, order: 0 },
          { name: 'تأهيل', color: '#8B5CF6', probability: 30, order: 1 },
          { name: 'عرض', color: '#F59E0B', probability: 50, order: 2 },
          { name: 'تفاوض', color: '#10B981', probability: 70, order: 3 },
          { name: 'إغلاق', color: '#EF4444', probability: 90, order: 4 },
        ],
      });
      toast.success('تم إنشاء المسار بنجاح');
      setIsCreatePipelineModalOpen(false);
      setNewPipelineData({ name: '', description: '', isDefault: false });
      fetchPipelines();
      setSelectedPipeline(newPipeline);
    } catch (error) {
      console.error('Failed to create pipeline:', error);
      toast.error('فشل في إنشاء المسار');
    } finally {
      setIsCreatingPipeline(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  const sortedStages = selectedPipeline
    ? [...selectedPipeline.stages].sort((a, b) => a.order - b.order)
    : [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إدارة المسارات</h1>
          <p className="text-gray-600 mt-1">
            قم بتخصيص مراحل الصفقات وفقاً لعملية البيع الخاصة بك
          </p>
        </div>
        <Button onClick={() => setIsCreatePipelineModalOpen(true)}>
          <Plus className="h-4 w-4" />
          إضافة مسار جديد
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Pipeline List */}
        <Card className="lg:col-span-1">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">المسارات</h3>
          </div>
          <div className="p-2">
            {pipelines.map((pipeline) => (
              <button
                key={pipeline.id}
                onClick={() => setSelectedPipeline(pipeline)}
                className={`w-full flex items-center justify-between p-3 rounded-lg text-start transition-colors ${
                  selectedPipeline?.id === pipeline.id
                    ? 'bg-primary-50 text-primary-700'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div>
                  <p className="font-medium">{pipeline.name}</p>
                  <p className="text-sm text-gray-500">
                    {pipeline.stages.length} مراحل
                  </p>
                </div>
                {pipeline.isDefault && (
                  <Badge variant="primary">افتراضي</Badge>
                )}
              </button>
            ))}
          </div>
        </Card>

        {/* Stage Editor */}
        <Card className="lg:col-span-3">
          {selectedPipeline ? (
            <>
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {selectedPipeline.name}
                  </h3>
                  {selectedPipeline.description && (
                    <p className="text-sm text-gray-500 mt-1">
                      {selectedPipeline.description}
                    </p>
                  )}
                </div>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4" />
                  إعدادات المسار
                </Button>
              </div>

              <div className="p-4">
                <p className="text-sm text-gray-500 mb-4">
                  اسحب المراحل لإعادة ترتيبها
                </p>
                <div className="space-y-3">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={sortedStages.map((s) => s.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {sortedStages.map((stage, index) => (
                        <SortableStageItem
                          key={stage.id}
                          stage={stage}
                          index={index}
                          isEditing={editingStageId === stage.id}
                          editingStageData={editingStageData}
                          onEditStart={startEditStage}
                          onEditSave={handleEditStage}
                          onEditCancel={() => setEditingStageId(null)}
                          onEditDataChange={setEditingStageData}
                          onDeleteConfirm={confirmDeleteStage}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>

                  {/* Add Stage Form */}
                  {isAddingStage ? (
                    <div className="flex items-center gap-3 p-4 bg-primary-50 rounded-lg border-2 border-dashed border-primary-200">
                      <div
                        className="h-4 w-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: newStageColor }}
                      />
                      <input
                        type="text"
                        value={newStageName}
                        onChange={(e) => setNewStageName(e.target.value)}
                        placeholder="اسم المرحلة الجديدة"
                        className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        autoFocus
                      />
                      <div className="flex gap-1">
                        {stageColors.map((color) => (
                          <button
                            key={color}
                            onClick={() => setNewStageColor(color)}
                            className={`h-6 w-6 rounded-full border-2 ${
                              newStageColor === color
                                ? 'border-gray-900'
                                : 'border-transparent'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <button
                        onClick={handleAddStage}
                        disabled={!newStageName.trim()}
                        className="p-1.5 text-green-600 hover:bg-green-100 rounded disabled:opacity-50"
                        type="button"
                        aria-label="إضافة المرحلة"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setIsAddingStage(false);
                          setNewStageName('');
                        }}
                        className="p-1.5 text-gray-600 hover:bg-gray-200 rounded"
                        type="button"
                        aria-label="إلغاء"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsAddingStage(true)}
                      className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 hover:border-primary-300 hover:text-primary-600 transition-colors"
                      type="button"
                    >
                      <Plus className="h-4 w-4" />
                      إضافة مرحلة جديدة
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              اختر مسار لعرض المراحل
            </div>
          )}
        </Card>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setStageToDelete(null);
        }}
        onConfirm={handleDeleteStage}
        title="حذف المرحلة"
        message={`هل أنت متأكد من حذف مرحلة "${stageToDelete?.name}"؟ سيتم نقل جميع الصفقات في هذه المرحلة.`}
        confirmText="حذف"
        cancelText="إلغاء"
        variant="danger"
      />

      {/* Create Pipeline Modal */}
      <Modal
        isOpen={isCreatePipelineModalOpen}
        onClose={() => {
          setIsCreatePipelineModalOpen(false);
          setNewPipelineData({ name: '', description: '', isDefault: false });
        }}
        title="إضافة مسار جديد"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="اسم المسار"
            value={newPipelineData.name}
            onChange={(e) => setNewPipelineData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="مثال: مبيعات الفلل"
            required
          />

          <Input
            label="الوصف (اختياري)"
            value={newPipelineData.description || ''}
            onChange={(e) => setNewPipelineData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="وصف مختصر للمسار"
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={newPipelineData.isDefault}
              onChange={(e) => setNewPipelineData(prev => ({ ...prev, isDefault: e.target.checked }))}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="isDefault" className="text-sm text-gray-700">
              تعيين كمسار افتراضي
            </label>
          </div>

          <p className="text-sm text-gray-500">
            سيتم إنشاء المسار مع مراحل افتراضية يمكنك تعديلها لاحقاً.
          </p>

          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreatePipelineModalOpen(false);
                setNewPipelineData({ name: '', description: '', isDefault: false });
              }}
              disabled={isCreatingPipeline}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleCreatePipeline}
              disabled={!newPipelineData.name.trim() || isCreatingPipeline}
              isLoading={isCreatingPipeline}
            >
              إنشاء المسار
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  );
}
