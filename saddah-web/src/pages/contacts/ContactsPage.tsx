import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Plus,
  Phone,
  Mail,
  Building2,
  User,
  Trash2,
} from 'lucide-react';
import { Button, Card, DataTable, Badge, Avatar, Modal, ModalFooter, type Column } from '@/components/ui';
import { contactsApi, type Contact, type ContactsParams } from '@/services/contacts.api';
import { CreateContactModal } from './CreateContactModal';

const sourceLabels: Record<string, { label: string; variant: 'default' | 'primary' | 'success' | 'warning' | 'info' }> = {
  manual: { label: 'يدوي', variant: 'default' },
  whatsapp_bot: { label: 'واتساب', variant: 'success' },
  voice_bot: { label: 'بوت صوتي', variant: 'info' },
  web_form: { label: 'نموذج ويب', variant: 'primary' },
  referral: { label: 'إحالة', variant: 'warning' },
  linkedin: { label: 'لينكدإن', variant: 'info' },
};

export function ContactsPage() {
  const navigate = useNavigate();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchValue, setSearchValue] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchContacts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: ContactsParams = {
        page: currentPage,
        limit: 20,
        sortBy: sortColumn,
        sortOrder: sortDirection,
      };
      if (searchValue) {
        params.search = searchValue;
      }

      const response = await contactsApi.getAll(params);
      setContacts(response.data);
      setTotalPages(response.meta.totalPages);
      setTotalItems(response.meta.total);
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
      toast.error('فشل في تحميل جهات الاتصال');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchValue, sortColumn, sortDirection]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleSort = (column: string, direction: 'asc' | 'desc') => {
    setSortColumn(column);
    setSortDirection(direction);
    setCurrentPage(1);
  };

  const handleSearch = (value: string) => {
    setSearchValue(value);
    setCurrentPage(1);
  };

  const handleRowClick = (contact: Contact) => {
    navigate(`/contacts/${contact.id}`);
  };

  const handleContactCreated = () => {
    setIsCreateModalOpen(false);
    fetchContacts();
    toast.success('تم إضافة جهة الاتصال بنجاح');
  };

  const handleDeleteSelected = async () => {
    setIsDeleting(true);
    try {
      await Promise.all(selectedContacts.map((id) => contactsApi.delete(id)));
      toast.success(`تم حذف ${selectedContacts.length} جهة اتصال بنجاح`);
      setSelectedContacts([]);
      setIsDeleteModalOpen(false);
      fetchContacts();
    } catch (error) {
      console.error('Failed to delete contacts:', error);
      toast.error('فشل في حذف جهات الاتصال');
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: Column<Contact>[] = [
    {
      key: 'name',
      header: 'الاسم',
      sortable: true,
      cell: (contact) => (
        <div className="flex items-center gap-3">
          <Avatar
            name={`${contact.firstName} ${contact.lastName}`}
            size="sm"
          />
          <div>
            <p className="font-medium text-gray-900">
              {contact.firstName} {contact.lastName}
            </p>
            {contact.title && (
              <p className="text-sm text-gray-500">{contact.title}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'معلومات التواصل',
      cell: (contact) => (
        <div className="space-y-1">
          {contact.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="h-3.5 w-3.5" />
              <span className="ltr-nums">{contact.phone}</span>
            </div>
          )}
          {contact.email && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail className="h-3.5 w-3.5" />
              <span>{contact.email}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'company',
      header: 'الشركة',
      cell: (contact) =>
        contact.company ? (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-gray-400" />
            <span>{contact.company.name}</span>
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      key: 'owner',
      header: 'المسؤول',
      cell: (contact) =>
        contact.owner ? (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-400" />
            <span>
              {contact.owner.firstName} {contact.owner.lastName}
            </span>
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      key: 'source',
      header: 'المصدر',
      cell: (contact) => {
        const sourceInfo = sourceLabels[contact.source] || {
          label: contact.source,
          variant: 'default' as const,
        };
        return <Badge variant={sourceInfo.variant}>{sourceInfo.label}</Badge>;
      },
    },
    {
      key: 'deals',
      header: 'الصفقات',
      cell: (contact) => (
        <span className="text-gray-600">{contact._count?.deals || 0}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'تاريخ الإضافة',
      sortable: true,
      cell: (contact) => (
        <span className="text-gray-600 ltr-nums">
          {new Date(contact.createdAt).toLocaleDateString('ar-SA')}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">جهات الاتصال</h1>
          <p className="text-gray-600 mt-1">
            إدارة جهات الاتصال والعملاء المحتملين
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selectedContacts.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(true)}
              className="text-error-500 border-error-200 hover:bg-error-50"
            >
              <Trash2 className="h-4 w-4" />
              حذف ({selectedContacts.length})
            </Button>
          )}
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4" />
            إضافة جهة اتصال
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        <DataTable
          data={contacts}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="لا توجد جهات اتصال"
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={20}
          onPageChange={setCurrentPage}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSort}
          searchValue={searchValue}
          onSearchChange={handleSearch}
          searchPlaceholder="بحث بالاسم أو البريد أو الهاتف..."
          onRowClick={handleRowClick}
          selectable
          selectedRows={selectedContacts}
          onSelectionChange={setSelectedContacts}
        />
      </Card>

      {/* Create Modal */}
      <CreateContactModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleContactCreated}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="تأكيد الحذف"
        size="sm"
      >
        <p className="text-gray-600">
          هل أنت متأكد من حذف {selectedContacts.length} جهة اتصال؟ لا يمكن التراجع عن هذا الإجراء.
        </p>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setIsDeleteModalOpen(false)}
            disabled={isDeleting}
          >
            إلغاء
          </Button>
          <Button
            variant="primary"
            onClick={handleDeleteSelected}
            disabled={isDeleting}
            className="bg-error-500 hover:bg-error-600"
          >
            {isDeleting ? 'جاري الحذف...' : 'حذف'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
