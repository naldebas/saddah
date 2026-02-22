import { useState, useEffect } from 'react';
import { Modal, ModalFooter, Button, Spinner } from '@/components/ui';
import { SearchInput } from '@/components/ui/SearchInput';
import { contactsApi, type Contact } from '@/services/contacts.api';
import { Phone, Mail, Building2 } from 'lucide-react';

interface LinkContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  companyId: string;
  companyName: string;
}

export function LinkContactModal({
  isOpen,
  onClose,
  onSuccess,
  companyId,
  companyName,
}: LinkContactModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState('');
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchContacts = async () => {
      setIsLoading(true);
      try {
        // Fetch contacts without a company or with search
        const data = await contactsApi.getAll({ limit: 100, search: search || undefined });
        // Filter to show contacts without a company assigned
        setContacts(data.data.filter(c => !c.companyId));
      } catch (error) {
        console.error('Failed to fetch contacts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContacts();
  }, [isOpen, search]);

  const handleLink = async () => {
    if (!selectedContactId) return;

    setIsLinking(true);
    try {
      await contactsApi.update(selectedContactId, { companyId });
      onSuccess();
      setSelectedContactId(null);
      setSearch('');
    } catch (error) {
      console.error('Failed to link contact:', error);
    } finally {
      setIsLinking(false);
    }
  };

  const handleClose = () => {
    setSelectedContactId(null);
    setSearch('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="إضافة جهة اتصال للشركة"
      size="lg"
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          اختر جهة اتصال لربطها بـ <span className="font-semibold">{companyName}</span>
        </p>

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="ابحث عن جهة اتصال..."
        />

        <div className="max-h-80 overflow-y-auto border rounded-lg">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner size="md" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {search ? 'لا توجد نتائج' : 'لا توجد جهات اتصال متاحة'}
            </div>
          ) : (
            <div className="divide-y">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className={`p-3 cursor-pointer transition-colors ${
                    selectedContactId === contact.id
                      ? 'bg-primary-50 border-r-4 border-primary-500'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedContactId(contact.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {contact.firstName} {contact.lastName}
                      </p>
                      {contact.title && (
                        <p className="text-sm text-gray-500">{contact.title}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      {contact.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" />
                          <span className="ltr-nums">{contact.phone}</span>
                        </span>
                      )}
                      {contact.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5" />
                          {contact.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ModalFooter>
        <Button variant="outline" onClick={handleClose}>
          إلغاء
        </Button>
        <Button
          onClick={handleLink}
          disabled={!selectedContactId}
          isLoading={isLinking}
        >
          <Building2 className="h-4 w-4" />
          ربط بالشركة
        </Button>
      </ModalFooter>
    </Modal>
  );
}
