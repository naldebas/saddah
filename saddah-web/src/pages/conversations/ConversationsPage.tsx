import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MessageSquare,
  Search,
  Phone,
  Send,
  Paperclip,
  MoreVertical,
  Check,
  CheckCheck,
  Bot,
  User,
  Settings,
  Smile,
  Mic,
  Image,
  FileText,
  X,
  Sparkles,
  Building2,
  Mail,
  MapPin,
  Clock,
  Tag,
  ChevronLeft,
  UserPlus,
  Calendar,
  LayoutTemplate,
  Hand,
  Target,
  DollarSign,
  Home,
  AlertCircle,
  CheckCircle,
  CircleDot,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

// Qualification states matching backend state machine
type QualificationState =
  | 'initial'
  | 'ask_name'
  | 'ask_property_type'
  | 'ask_location'
  | 'ask_budget'
  | 'ask_timeline'
  | 'ask_financing'
  | 'qualified'
  | 'offer_appointment'
  | 'schedule_appointment'
  | 'human_handoff';

interface QualificationData {
  name?: string;
  propertyType?: 'villa' | 'apartment' | 'land' | 'duplex' | 'townhouse';
  location?: {
    city?: string;
    neighborhoods?: string[];
  };
  budget?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  timeline?: 'immediate' | 'within_month' | 'within_3_months' | 'within_6_months' | 'within_year';
  needsFinancing?: boolean;
  appointmentDate?: string;
  appointmentTime?: string;
}

interface Conversation {
  id: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  company?: string;
  lastMessage: string;
  time: string;
  unread: number;
  channel: 'whatsapp' | 'sms' | 'email';
  status: 'read' | 'delivered' | 'sent';
  isOnline?: boolean;
  avatar?: string;
  tags?: string[];
  // WhatsApp bot fields
  botStatus?: 'bot' | 'pending' | 'active' | 'closed';
  qualificationState?: QualificationState;
  qualificationData?: QualificationData;
  qualificationScore?: number;
}

interface Message {
  id: string;
  text: string;
  sender: 'contact' | 'agent' | 'bot';
  time: string;
  status?: 'sent' | 'delivered' | 'read';
  attachments?: { type: string; name: string; url: string }[];
}

const quickReplies = [
  'شكراً لتواصلك! سأرد عليك في أقرب وقت.',
  'هل يمكنني مساعدتك بمزيد من المعلومات؟',
  'سأقوم بإرسال التفاصيل إليك الآن.',
  'هل ترغب في جدولة موعد للمعاينة؟',
];

const aiSuggestions = [
  'بناءً على اهتمام العميل، يمكنك اقتراح فيلا في حي الياسمين بسعر 1.8 مليون ريال.',
  'العميل يبحث عن تمويل عقاري - يمكنك ذكر شراكتنا مع البنوك.',
];

// WhatsApp approved template messages
const templateMessages = [
  { id: '1', name: 'welcome_lead', displayName: 'ترحيب بالعميل الجديد', category: 'MARKETING' },
  { id: '2', name: 'follow_up', displayName: 'متابعة العميل', category: 'MARKETING' },
  { id: '3', name: 'appointment_reminder', displayName: 'تذكير بالموعد', category: 'UTILITY' },
  { id: '4', name: 'property_listing', displayName: 'عرض عقار جديد', category: 'MARKETING' },
  { id: '5', name: 'financing_info', displayName: 'معلومات التمويل العقاري', category: 'UTILITY' },
];

// State display names in Arabic
const stateDisplayNames: Record<QualificationState, string> = {
  initial: 'بداية المحادثة',
  ask_name: 'طلب الاسم',
  ask_property_type: 'نوع العقار',
  ask_location: 'الموقع',
  ask_budget: 'الميزانية',
  ask_timeline: 'الجدول الزمني',
  ask_financing: 'التمويل',
  qualified: 'مؤهل',
  offer_appointment: 'عرض موعد',
  schedule_appointment: 'جدولة موعد',
  human_handoff: 'تحويل لموظف',
};

// Property type display names
const propertyTypeNames: Record<string, string> = {
  villa: 'فيلا',
  apartment: 'شقة',
  land: 'أرض',
  duplex: 'دوبلكس',
  townhouse: 'تاون هاوس',
};

// Timeline display names
const timelineNames: Record<string, string> = {
  immediate: 'فوري',
  within_month: 'خلال شهر',
  within_3_months: 'خلال 3 شهور',
  within_6_months: 'خلال 6 شهور',
  within_year: 'خلال سنة',
};

export function ConversationsPage() {
  const { t } = useTranslation();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showAiSuggestions, setShowAiSuggestions] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const conversations: Conversation[] = [
    {
      id: '1',
      contactName: 'محمد العتيبي',
      contactPhone: '+966 50 123 4567',
      contactEmail: 'mohammed@email.com',
      company: 'شركة الأفق للاستثمار',
      lastMessage: 'نعم، أنا مهتم بالفيلا في حي النرجس',
      time: 'منذ 5 دقائق',
      unread: 2,
      channel: 'whatsapp',
      status: 'delivered',
      isOnline: true,
      tags: ['عميل VIP', 'مهتم بالفلل'],
      botStatus: 'active',
      qualificationState: 'qualified',
      qualificationData: {
        name: 'محمد العتيبي',
        propertyType: 'villa',
        location: { city: 'الرياض', neighborhoods: ['النرجس', 'الياسمين'] },
        budget: { min: 1800000, max: 2200000, currency: 'SAR' },
        timeline: 'within_3_months',
        needsFinancing: false,
      },
      qualificationScore: 85,
    },
    {
      id: '2',
      contactName: 'فاطمة الشهري',
      contactPhone: '+966 55 987 6543',
      lastMessage: 'متى يمكنني زيارة الشقة؟',
      time: 'منذ 30 دقيقة',
      unread: 0,
      channel: 'whatsapp',
      status: 'read',
      isOnline: false,
      tags: ['شقق'],
      botStatus: 'bot',
      qualificationState: 'ask_timeline',
      qualificationData: {
        name: 'فاطمة الشهري',
        propertyType: 'apartment',
        location: { city: 'جدة' },
        budget: { min: 500000, max: 800000, currency: 'SAR' },
      },
      qualificationScore: 55,
    },
    {
      id: '3',
      contactName: 'عبدالله القحطاني',
      contactPhone: '+966 54 456 7890',
      company: 'مؤسسة البناء الحديث',
      lastMessage: 'شكراً لكم، سأتواصل معكم قريباً',
      time: 'منذ ساعة',
      unread: 0,
      channel: 'whatsapp',
      status: 'read',
      isOnline: true,
      botStatus: 'closed',
      qualificationState: 'qualified',
      qualificationData: {
        name: 'عبدالله القحطاني',
        propertyType: 'land',
        location: { city: 'الرياض', neighborhoods: ['العقيق'] },
        budget: { min: 3000000, max: 5000000, currency: 'SAR' },
        timeline: 'within_6_months',
        needsFinancing: true,
      },
      qualificationScore: 90,
    },
    {
      id: '4',
      contactName: 'نورة المالكي',
      contactPhone: '+966 59 111 2222',
      lastMessage: 'هل يتوفر تمويل عقاري؟',
      time: 'منذ 2 ساعة',
      unread: 1,
      channel: 'whatsapp',
      status: 'sent',
      isOnline: false,
      tags: ['تمويل عقاري'],
      botStatus: 'bot',
      qualificationState: 'ask_financing',
      qualificationData: {
        name: 'نورة المالكي',
        propertyType: 'villa',
        location: { city: 'الدمام' },
        budget: { min: 1200000, max: 1500000, currency: 'SAR' },
        timeline: 'within_month',
      },
      qualificationScore: 65,
    },
    {
      id: '5',
      contactName: 'خالد الدوسري',
      contactPhone: '+966 56 333 4444',
      lastMessage: 'أريد معاينة العقار غداً',
      time: 'منذ 3 ساعات',
      unread: 0,
      channel: 'whatsapp',
      status: 'read',
      isOnline: false,
      botStatus: 'pending',
      qualificationState: 'human_handoff',
      qualificationData: {
        name: 'خالد الدوسري',
        propertyType: 'duplex',
      },
      qualificationScore: 30,
    },
  ];

  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: 'السلام عليكم، أنا مهتم بالعقارات في منطقة الرياض', sender: 'contact', time: '10:30 ص', status: 'read' },
    { id: '2', text: 'وعليكم السلام، أهلاً بك! كيف يمكنني مساعدتك؟', sender: 'bot', time: '10:31 ص', status: 'read' },
    { id: '3', text: 'أبحث عن فيلا في حي النرجس بميزانية 2 مليون ريال', sender: 'contact', time: '10:32 ص', status: 'read' },
    { id: '4', text: 'ممتاز! لدينا عدة خيارات متاحة في هذا النطاق السعري. هل تفضل فيلا جاهزة أو على الخارطة؟', sender: 'agent', time: '10:35 ص', status: 'read' },
    { id: '5', text: 'نعم، أنا مهتم بالفيلا في حي النرجس', sender: 'contact', time: '10:40 ص', status: 'delivered' },
  ]);

  const selectedContact = conversations.find(c => c.id === selectedConversation);

  const filteredConversations = conversations.filter(conv =>
    conv.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!message.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: message,
      sender: 'agent',
      time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
    };

    setMessages([...messages, newMessage]);
    setMessage('');
  };

  const handleQuickReply = (reply: string) => {
    setMessage(reply);
  };

  const handleTakeover = () => {
    // TODO: API call to take over from bot
    console.log('Taking over conversation from bot');
    // This would update the conversation status from 'bot' to 'active'
  };

  const handleSendTemplate = (templateId: string) => {
    // TODO: API call to send template message
    console.log('Sending template:', templateId);
    setShowTemplateSelector(false);
  };

  const handleConvertToLead = () => {
    // TODO: API call to convert to lead
    console.log('Converting to lead');
  };

  const handleScheduleCallback = () => {
    // TODO: Open scheduling modal
    console.log('Scheduling callback');
  };

  const formatBudget = (budget?: { min?: number; max?: number; currency?: string }) => {
    if (!budget) return '-';
    const formatter = new Intl.NumberFormat('ar-SA');
    const min = budget.min ? formatter.format(budget.min) : '';
    const max = budget.max ? formatter.format(budget.max) : '';
    const currency = budget.currency === 'SAR' ? 'ريال' : budget.currency || '';
    if (min && max) return `${min} - ${max} ${currency}`;
    if (max) return `${max} ${currency}`;
    return '-';
  };

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-gray-400';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 30) return 'text-orange-500';
    return 'text-red-500';
  };

  const getScoreBgColor = (score?: number) => {
    if (!score) return 'bg-gray-100';
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    if (score >= 30) return 'bg-orange-100';
    return 'bg-red-100';
  };

  const getBotStatusBadge = (botStatus?: string) => {
    switch (botStatus) {
      case 'bot':
        return { label: 'البوت يتولى', color: 'bg-blue-100 text-blue-700', icon: Bot };
      case 'pending':
        return { label: 'ينتظر موظف', color: 'bg-yellow-100 text-yellow-700', icon: AlertCircle };
      case 'active':
        return { label: 'موظف يتولى', color: 'bg-green-100 text-green-700', icon: User };
      case 'closed':
        return { label: 'مغلقة', color: 'bg-gray-100 text-gray-700', icon: CheckCircle };
      default:
        return null;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'read':
        return <CheckCheck className="h-4 w-4 text-blue-500" />;
      case 'delivered':
        return <CheckCheck className="h-4 w-4 text-gray-400" />;
      default:
        return <Check className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('nav.conversations')}</h1>
          <p className="text-gray-500 mt-1">إدارة المحادثات مع العملاء عبر واتساب</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline">
            <Bot className="h-4 w-4 me-2" />
            إعدادات البوت
          </Button>
          <Button>
            <MessageSquare className="h-4 w-4 me-2" />
            محادثة جديدة
          </Button>
        </div>
      </div>

      {/* WhatsApp Integration Notice */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-green-500 flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-green-800">واتساب بيزنس API</h3>
              <p className="text-sm text-green-600">
                قم بربط حساب واتساب بيزنس لبدء استقبال الرسائل والرد التلقائي
              </p>
            </div>
            <Button variant="outline" className="border-green-300 text-green-700 hover:bg-green-100">
              <Settings className="h-4 w-4 me-2" />
              إعداد الربط
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-300px)] min-h-[500px]">
        {/* Conversations List */}
        <Card className="lg:col-span-4 flex flex-col">
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في المحادثات..."
                className="w-full ps-10 pe-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                aria-label="بحث في المحادثات"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => {
                  setSelectedConversation(conv.id);
                  setShowContactInfo(false);
                }}
                className={`w-full p-4 flex items-start gap-3 border-b border-gray-50 hover:bg-gray-50 transition-colors text-start ${
                  selectedConversation === conv.id ? 'bg-primary-50' : ''
                }`}
                type="button"
              >
                <div className="relative">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <User className="h-6 w-6 text-gray-500" />
                  </div>
                  {conv.isOnline && (
                    <div className="absolute bottom-0 end-0 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-white" />
                  )}
                  <div className="absolute -bottom-1 -start-1 h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
                    <MessageSquare className="h-3 w-3 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{conv.contactName}</span>
                    <span className="text-xs text-gray-400">{conv.time}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-sm text-gray-500 truncate">{conv.lastMessage}</p>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(conv.status)}
                      {conv.unread > 0 && (
                        <span className="h-5 w-5 rounded-full bg-primary-500 text-white text-xs flex items-center justify-center">
                          {conv.unread}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Bot Status & Tags */}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {conv.botStatus && getBotStatusBadge(conv.botStatus) && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${getBotStatusBadge(conv.botStatus)?.color}`}>
                        {(() => {
                          const badge = getBotStatusBadge(conv.botStatus);
                          const Icon = badge?.icon;
                          return Icon ? <Icon className="h-3 w-3" /> : null;
                        })()}
                        {getBotStatusBadge(conv.botStatus)?.label}
                      </span>
                    )}
                    {conv.qualificationScore && (
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getScoreBgColor(conv.qualificationScore)} ${getScoreColor(conv.qualificationScore)}`}>
                        {conv.qualificationScore}%
                      </span>
                    )}
                    {conv.tags && conv.tags.slice(0, 1).map((tag, idx) => (
                      <span key={idx} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Chat Area */}
        <Card className={`flex flex-col ${showContactInfo ? 'lg:col-span-5' : 'lg:col-span-8'}`}>
          {selectedConversation && selectedContact ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-500" />
                    </div>
                    {selectedContact.isOnline && (
                      <div className="absolute bottom-0 end-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{selectedContact.contactName}</p>
                      {/* Bot Status Badge */}
                      {selectedContact.botStatus && getBotStatusBadge(selectedContact.botStatus) && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${getBotStatusBadge(selectedContact.botStatus)?.color}`}>
                          {(() => {
                            const badge = getBotStatusBadge(selectedContact.botStatus);
                            const Icon = badge?.icon;
                            return Icon ? <Icon className="h-3 w-3" /> : null;
                          })()}
                          {getBotStatusBadge(selectedContact.botStatus)?.label}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <p className={`text-xs ${selectedContact.isOnline ? 'text-green-500' : 'text-gray-400'}`}>
                        {selectedContact.isOnline ? 'متصل الآن' : 'آخر ظهور منذ ساعة'}
                      </p>
                      {selectedContact.qualificationState && (
                        <span className="text-xs text-gray-400">
                          • {stateDisplayNames[selectedContact.qualificationState]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Takeover Button - Show when bot is handling */}
                  {selectedContact.botStatus === 'bot' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTakeover}
                      className="border-orange-300 text-orange-600 hover:bg-orange-50"
                    >
                      <Hand className="h-4 w-4 me-1" />
                      تولي المحادثة
                    </Button>
                  )}
                  <Button variant="ghost" size="sm">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowContactInfo(!showContactInfo)}
                    className={showContactInfo ? 'bg-gray-100' : ''}
                  >
                    <User className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* AI Suggestions Banner */}
              {showAiSuggestions && (
                <div className="p-3 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-purple-500 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-purple-800">اقتراحات الذكاء الاصطناعي</p>
                        <button onClick={() => setShowAiSuggestions(false)}>
                          <X className="h-4 w-4 text-purple-400 hover:text-purple-600" />
                        </button>
                      </div>
                      <p className="text-xs text-purple-600 mt-1">{aiSuggestions[0]}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-white">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === 'contact' ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[70%] p-3 rounded-2xl shadow-sm ${
                        msg.sender === 'contact'
                          ? 'bg-white text-gray-900 rounded-ts-none'
                          : msg.sender === 'bot'
                          ? 'bg-gradient-to-br from-blue-100 to-blue-50 text-blue-900 rounded-te-none'
                          : 'bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-te-none'
                      }`}
                    >
                      {msg.sender === 'bot' && (
                        <div className="flex items-center gap-1 text-xs text-blue-600 mb-1">
                          <Bot className="h-3 w-3" />
                          رد تلقائي
                        </div>
                      )}
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                      <div className={`flex items-center justify-end gap-1 mt-1 ${
                        msg.sender === 'contact' ? 'text-gray-400' : msg.sender === 'bot' ? 'text-blue-400' : 'text-primary-200'
                      }`}>
                        <span className="text-xs">{msg.time}</span>
                        {msg.sender !== 'contact' && <CheckCheck className="h-3 w-3" />}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Actions Bar */}
              <div className="p-2 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleConvertToLead}
                    className="text-xs"
                  >
                    <UserPlus className="h-3 w-3 me-1" />
                    تحويل لعميل
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleScheduleCallback}
                    className="text-xs"
                  >
                    <Calendar className="h-3 w-3 me-1" />
                    جدولة اتصال
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTemplateSelector(!showTemplateSelector)}
                    className={`text-xs ${showTemplateSelector ? 'bg-green-50 border-green-300' : ''}`}
                  >
                    <LayoutTemplate className="h-3 w-3 me-1" />
                    قالب رسالة
                  </Button>
                </div>
                {selectedContact.qualificationScore && (
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${getScoreBgColor(selectedContact.qualificationScore)}`}>
                    <Target className="h-3 w-3" />
                    <span className={`text-xs font-medium ${getScoreColor(selectedContact.qualificationScore)}`}>
                      نقاط التأهيل: {selectedContact.qualificationScore}%
                    </span>
                  </div>
                )}
              </div>

              {/* Template Selector */}
              {showTemplateSelector && (
                <div className="p-3 border-t border-gray-100 bg-green-50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-green-800">اختر قالب رسالة</p>
                    <button onClick={() => setShowTemplateSelector(false)}>
                      <X className="h-4 w-4 text-green-400 hover:text-green-600" />
                    </button>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {templateMessages.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => handleSendTemplate(template.id)}
                        className="flex-shrink-0 px-3 py-2 text-xs bg-white border border-green-200 rounded-lg text-green-700 hover:bg-green-100 hover:border-green-300 transition-colors"
                      >
                        <span className="block font-medium">{template.displayName}</span>
                        <span className="block text-green-500 mt-0.5">{template.category}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Replies */}
              <div className="p-3 border-t border-gray-100 bg-gray-50">
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {quickReplies.map((reply, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleQuickReply(reply)}
                      className="flex-shrink-0 px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-full text-gray-700 hover:bg-gray-100 hover:border-gray-300 transition-colors"
                    >
                      {reply.substring(0, 30)}...
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-100 bg-white">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="text-gray-500">
                      <Paperclip className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-500">
                      <Image className="h-5 w-5" />
                    </Button>
                  </div>
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="اكتب رسالتك..."
                      className="w-full px-4 py-2.5 pe-12 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <button className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <Smile className="h-5 w-5" />
                    </button>
                  </div>
                  {message.trim() ? (
                    <Button onClick={handleSendMessage} className="rounded-full h-10 w-10 p-0">
                      <Send className="h-5 w-5" />
                    </Button>
                  ) : (
                    <Button variant="outline" className="rounded-full h-10 w-10 p-0">
                      <Mic className="h-5 w-5" />
                    </Button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="font-medium text-gray-900 text-lg">اختر محادثة</h3>
                <p className="text-sm text-gray-500 mt-1">
                  اختر محادثة من القائمة لعرض الرسائل
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* Contact Info Panel */}
        {showContactInfo && selectedContact && (
          <Card className="lg:col-span-3 flex flex-col">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">معلومات جهة الاتصال</h3>
              <button onClick={() => setShowContactInfo(false)}>
                <ChevronLeft className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {/* Contact Avatar & Name */}
              <div className="text-center mb-6">
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center mx-auto mb-3">
                  <User className="h-10 w-10 text-primary-600" />
                </div>
                <h4 className="font-semibold text-gray-900">{selectedContact.contactName}</h4>
                {selectedContact.company && (
                  <p className="text-sm text-gray-500">{selectedContact.company}</p>
                )}
              </div>

              {/* Contact Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">الجوال</p>
                    <p className="text-sm font-medium text-gray-900 ltr">{selectedContact.contactPhone}</p>
                  </div>
                </div>

                {selectedContact.contactEmail && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">البريد الإلكتروني</p>
                      <p className="text-sm font-medium text-gray-900">{selectedContact.contactEmail}</p>
                    </div>
                  </div>
                )}

                {selectedContact.company && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Building2 className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">الشركة</p>
                      <p className="text-sm font-medium text-gray-900">{selectedContact.company}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">الموقع</p>
                    <p className="text-sm font-medium text-gray-900">الرياض، المملكة العربية السعودية</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">تاريخ الإنشاء</p>
                    <p className="text-sm font-medium text-gray-900">15 يناير 2026</p>
                  </div>
                </div>

                {/* Tags */}
                {selectedContact.tags && selectedContact.tags.length > 0 && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Tag className="h-4 w-4 text-gray-400" />
                      <p className="text-xs text-gray-500">الوسوم</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedContact.tags.map((tag, idx) => (
                        <Badge key={idx} variant="default">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Qualification Data Section */}
                {selectedContact.qualificationData && (
                  <div className="mt-4 p-3 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border border-purple-100">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-purple-800">بيانات التأهيل</h4>
                      {selectedContact.qualificationScore && (
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${getScoreBgColor(selectedContact.qualificationScore)}`}>
                          <span className={`text-sm font-bold ${getScoreColor(selectedContact.qualificationScore)}`}>
                            {selectedContact.qualificationScore}%
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Current State */}
                    {selectedContact.qualificationState && (
                      <div className="flex items-center gap-2 p-2 bg-white rounded-lg mb-2">
                        <CircleDot className="h-4 w-4 text-purple-500" />
                        <div className="flex-1">
                          <p className="text-xs text-gray-500">المرحلة الحالية</p>
                          <p className="text-sm font-medium text-purple-700">
                            {stateDisplayNames[selectedContact.qualificationState]}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Collected Data */}
                    <div className="space-y-2">
                      {/* Name */}
                      <div className={`flex items-center gap-2 p-2 rounded-lg ${selectedContact.qualificationData.name ? 'bg-green-50' : 'bg-gray-50'}`}>
                        <User className={`h-4 w-4 ${selectedContact.qualificationData.name ? 'text-green-500' : 'text-gray-300'}`} />
                        <div className="flex-1">
                          <p className="text-xs text-gray-500">الاسم</p>
                          <p className="text-sm font-medium">
                            {selectedContact.qualificationData.name || <span className="text-gray-400">لم يُحدد</span>}
                          </p>
                        </div>
                        {selectedContact.qualificationData.name && <CheckCircle className="h-4 w-4 text-green-500" />}
                      </div>

                      {/* Property Type */}
                      <div className={`flex items-center gap-2 p-2 rounded-lg ${selectedContact.qualificationData.propertyType ? 'bg-green-50' : 'bg-gray-50'}`}>
                        <Home className={`h-4 w-4 ${selectedContact.qualificationData.propertyType ? 'text-green-500' : 'text-gray-300'}`} />
                        <div className="flex-1">
                          <p className="text-xs text-gray-500">نوع العقار</p>
                          <p className="text-sm font-medium">
                            {selectedContact.qualificationData.propertyType
                              ? propertyTypeNames[selectedContact.qualificationData.propertyType]
                              : <span className="text-gray-400">لم يُحدد</span>}
                          </p>
                        </div>
                        {selectedContact.qualificationData.propertyType && <CheckCircle className="h-4 w-4 text-green-500" />}
                      </div>

                      {/* Location */}
                      <div className={`flex items-center gap-2 p-2 rounded-lg ${selectedContact.qualificationData.location?.city ? 'bg-green-50' : 'bg-gray-50'}`}>
                        <MapPin className={`h-4 w-4 ${selectedContact.qualificationData.location?.city ? 'text-green-500' : 'text-gray-300'}`} />
                        <div className="flex-1">
                          <p className="text-xs text-gray-500">الموقع</p>
                          <p className="text-sm font-medium">
                            {selectedContact.qualificationData.location?.city ? (
                              <>
                                {selectedContact.qualificationData.location.city}
                                {selectedContact.qualificationData.location.neighborhoods?.length && (
                                  <span className="text-gray-500">
                                    {' - '}
                                    {selectedContact.qualificationData.location.neighborhoods.join('، ')}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-gray-400">لم يُحدد</span>
                            )}
                          </p>
                        </div>
                        {selectedContact.qualificationData.location?.city && <CheckCircle className="h-4 w-4 text-green-500" />}
                      </div>

                      {/* Budget */}
                      <div className={`flex items-center gap-2 p-2 rounded-lg ${selectedContact.qualificationData.budget?.max ? 'bg-green-50' : 'bg-gray-50'}`}>
                        <DollarSign className={`h-4 w-4 ${selectedContact.qualificationData.budget?.max ? 'text-green-500' : 'text-gray-300'}`} />
                        <div className="flex-1">
                          <p className="text-xs text-gray-500">الميزانية</p>
                          <p className="text-sm font-medium">
                            {formatBudget(selectedContact.qualificationData.budget) !== '-'
                              ? formatBudget(selectedContact.qualificationData.budget)
                              : <span className="text-gray-400">لم تُحدد</span>}
                          </p>
                        </div>
                        {selectedContact.qualificationData.budget?.max && <CheckCircle className="h-4 w-4 text-green-500" />}
                      </div>

                      {/* Timeline */}
                      <div className={`flex items-center gap-2 p-2 rounded-lg ${selectedContact.qualificationData.timeline ? 'bg-green-50' : 'bg-gray-50'}`}>
                        <Clock className={`h-4 w-4 ${selectedContact.qualificationData.timeline ? 'text-green-500' : 'text-gray-300'}`} />
                        <div className="flex-1">
                          <p className="text-xs text-gray-500">الجدول الزمني</p>
                          <p className="text-sm font-medium">
                            {selectedContact.qualificationData.timeline
                              ? timelineNames[selectedContact.qualificationData.timeline]
                              : <span className="text-gray-400">لم يُحدد</span>}
                          </p>
                        </div>
                        {selectedContact.qualificationData.timeline && <CheckCircle className="h-4 w-4 text-green-500" />}
                      </div>

                      {/* Financing */}
                      {selectedContact.qualificationData.needsFinancing !== undefined && (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50">
                          <Building2 className="h-4 w-4 text-green-500" />
                          <div className="flex-1">
                            <p className="text-xs text-gray-500">التمويل العقاري</p>
                            <p className="text-sm font-medium">
                              {selectedContact.qualificationData.needsFinancing ? 'يحتاج تمويل' : 'لا يحتاج تمويل'}
                            </p>
                          </div>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-6 space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="h-4 w-4 me-2" />
                  عرض الملف الكامل
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={handleConvertToLead}>
                  <UserPlus className="h-4 w-4 me-2" />
                  تحويل إلى عميل محتمل
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Building2 className="h-4 w-4 me-2" />
                  إنشاء صفقة
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={handleScheduleCallback}>
                  <Calendar className="h-4 w-4 me-2" />
                  جدولة موعد
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
