// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

// Generate consistent UUIDs for pipelines (so we can reference them)
const MAIN_PIPELINE_ID = randomUUID();
const RENTAL_PIPELINE_ID = randomUUID();

async function main() {
  console.log('🌱 Seeding database...');

  // Create default tenant
  const tenant = await prisma.tenant.upsert({
    where: { domain: 'demo.saddah.io' },
    update: {},
    create: {
      name: 'شركة صداح للعقارات',
      domain: 'demo.saddah.io',
      plan: 'professional',
      settings: {
        language: 'ar',
        timezone: 'Asia/Riyadh',
        currency: 'SAR',
      },
    },
  });

  console.log(`✅ Created tenant: ${tenant.name}`);

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  const admin = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: 'admin@saddah.io',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'admin@saddah.io',
      passwordHash: adminPassword,
      firstName: 'مدير',
      lastName: 'النظام',
      role: 'admin',
      language: 'ar',
    },
  });

  console.log(`✅ Created admin user: ${admin.email}`);

  // Create sales manager user
  const managerPassword = await bcrypt.hash('Manager@123', 10);
  const salesManager = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: 'sara@saddah.io',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'sara@saddah.io',
      passwordHash: managerPassword,
      firstName: 'سارة',
      lastName: 'الحربي',
      phone: '+966501112233',
      role: 'sales_manager',
      language: 'ar',
    },
  });

  console.log(`✅ Created sales manager: ${salesManager.email}`);

  // Create sales rep users
  const salesPassword = await bcrypt.hash('Sales@123', 10);
  const salesRep1 = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: 'ahmad@saddah.io',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'ahmad@saddah.io',
      passwordHash: salesPassword,
      firstName: 'أحمد',
      lastName: 'المطيري',
      phone: '+966501234567',
      role: 'sales_rep',
      language: 'ar',
    },
  });

  const salesRep2 = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: 'khalid@saddah.io',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'khalid@saddah.io',
      passwordHash: salesPassword,
      firstName: 'خالد',
      lastName: 'العمري',
      phone: '+966509876543',
      role: 'sales_rep',
      language: 'ar',
    },
  });

  console.log(`✅ Created sales reps: ${salesRep1.email}, ${salesRep2.email}`);

  // ============================================
  // COMPANIES
  // ============================================

  const companiesData = [
    {
      name: 'مجموعة الراجحي العقارية',
      industry: 'تطوير عقاري',
      website: 'https://alrajhi-realestate.sa',
      phone: '+966112345678',
      email: 'info@alrajhi-realestate.sa',
      address: 'طريق الملك فهد، برج الراجحي',
      city: 'الرياض',
      size: 'enterprise',
      tags: ['VIP', 'شريك استراتيجي'],
    },
    {
      name: 'شركة النخيل للتطوير',
      industry: 'تطوير عقاري',
      website: 'https://nakheeldevelopment.sa',
      phone: '+966126789012',
      email: 'contact@nakheel.sa',
      address: 'شارع التحلية، حي الروضة',
      city: 'جدة',
      size: 'large',
      tags: ['عميل مميز'],
    },
    {
      name: 'مكتب الأصيل للعقارات',
      industry: 'وساطة عقارية',
      phone: '+966138901234',
      email: 'info@aseel-realestate.sa',
      address: 'شارع الأمير سلطان',
      city: 'الدمام',
      size: 'medium',
    },
    {
      name: 'دار الخليج للاستثمار',
      industry: 'استثمار عقاري',
      website: 'https://dargulf.sa',
      phone: '+966114567890',
      email: 'invest@dargulf.sa',
      address: 'حي العليا، مركز الفيصلية',
      city: 'الرياض',
      size: 'large',
      tags: ['مستثمر'],
    },
    {
      name: 'شركة البناء الحديث',
      industry: 'مقاولات',
      phone: '+966112223344',
      email: 'info@modernbuild.sa',
      address: 'المنطقة الصناعية الثانية',
      city: 'الرياض',
      size: 'medium',
    },
  ];

  const companies: any[] = [];
  const owners = [salesManager, salesRep1, salesRep2, salesManager, salesRep1];
  for (let i = 0; i < companiesData.length; i++) {
    const company = await prisma.company.create({
      data: {
        tenantId: tenant.id,
        ownerId: owners[i % owners.length].id,
        ...companiesData[i],
      },
    });
    companies.push(company);
  }

  console.log(`✅ Created ${companies.length} companies`);

  // ============================================
  // CONTACTS
  // ============================================

  const contactsData = [
    {
      firstName: 'محمد',
      lastName: 'العتيبي',
      email: 'mohammed.otaibi@alrajhi-realestate.sa',
      phone: '+966551234567',
      whatsapp: '+966551234567',
      title: 'مدير المشتريات',
      source: 'referral',
      companyId: companies[0].id,
      ownerId: salesRep1.id,
      tags: ['صانع قرار', 'VIP'],
    },
    {
      firstName: 'فاطمة',
      lastName: 'الشمري',
      email: 'fatima@alrajhi-realestate.sa',
      phone: '+966559876543',
      title: 'مديرة العلاقات',
      source: 'linkedin',
      companyId: companies[0].id,
      ownerId: salesRep1.id,
    },
    {
      firstName: 'عبدالله',
      lastName: 'القحطاني',
      email: 'abdullah@nakheeldevelopment.sa',
      phone: '+966554567890',
      whatsapp: '+966554567890',
      title: 'المدير التنفيذي',
      source: 'web_form',
      companyId: companies[1].id,
      ownerId: salesRep2.id,
      tags: ['CEO', 'صانع قرار'],
    },
    {
      firstName: 'نورة',
      lastName: 'الدوسري',
      email: 'noura@aseel-realestate.sa',
      phone: '+966556789012',
      title: 'مديرة المبيعات',
      source: 'whatsapp_bot',
      companyId: companies[2].id,
      ownerId: salesRep1.id,
    },
    {
      firstName: 'سعود',
      lastName: 'المالكي',
      email: 'saud.malki@gmail.com',
      phone: '+966557890123',
      whatsapp: '+966557890123',
      source: 'whatsapp_bot',
      ownerId: salesRep2.id,
      tags: ['مستثمر فردي'],
    },
    {
      firstName: 'ريم',
      lastName: 'السبيعي',
      email: 'reem.subaie@outlook.com',
      phone: '+966558901234',
      source: 'voice_bot',
      ownerId: salesRep1.id,
    },
    {
      firstName: 'فهد',
      lastName: 'العنزي',
      email: 'fahad.anzi@dargulf.sa',
      phone: '+966552345678',
      whatsapp: '+966552345678',
      title: 'مدير الاستثمار',
      source: 'manual',
      companyId: companies[3].id,
      ownerId: salesManager.id,
      tags: ['صانع قرار', 'استثمار كبير'],
    },
  ];

  const contacts: any[] = [];
  for (const contactData of contactsData) {
    const contact = await prisma.contact.create({
      data: {
        tenantId: tenant.id,
        ...contactData,
      },
    });
    contacts.push(contact);
  }

  console.log(`✅ Created ${contacts.length} contacts`);

  // ============================================
  // PIPELINES & STAGES
  // ============================================

  // Main sales pipeline (using UUID)
  const mainPipeline = await prisma.pipeline.upsert({
    where: { id: MAIN_PIPELINE_ID },
    update: {},
    create: {
      id: MAIN_PIPELINE_ID,
      tenantId: tenant.id,
      name: 'مسار المبيعات الرئيسي',
      isDefault: true,
    },
  });

  const mainStages = [
    { name: 'عميل محتمل', order: 0, probability: 10, color: '#6B7280' },
    { name: 'تواصل أولي', order: 1, probability: 20, color: '#3B82F6' },
    { name: 'معاينة', order: 2, probability: 35, color: '#8B5CF6' },
    { name: 'عرض سعر', order: 3, probability: 50, color: '#EC4899' },
    { name: 'تفاوض', order: 4, probability: 70, color: '#F59E0B' },
    { name: 'مراجعة العقد', order: 5, probability: 90, color: '#10B981' },
  ];

  const mainStagesCreated: any[] = [];
  for (const stage of mainStages) {
    const stageId = randomUUID();
    const created = await prisma.pipelineStage.upsert({
      where: { id: stageId },
      update: stage,
      create: {
        id: stageId,
        pipelineId: mainPipeline.id,
        ...stage,
      },
    });
    mainStagesCreated.push(created);
  }

  console.log(`✅ Created main pipeline with ${mainStages.length} stages`);

  // Rental pipeline (using UUID)
  const rentalPipeline = await prisma.pipeline.upsert({
    where: { id: RENTAL_PIPELINE_ID },
    update: {},
    create: {
      id: RENTAL_PIPELINE_ID,
      tenantId: tenant.id,
      name: 'مسار التأجير',
      isDefault: false,
    },
  });

  const rentalStages = [
    { name: 'استفسار', order: 0, probability: 10, color: '#6B7280' },
    { name: 'معاينة', order: 1, probability: 30, color: '#3B82F6' },
    { name: 'تقديم عرض', order: 2, probability: 50, color: '#8B5CF6' },
    { name: 'توقيع العقد', order: 3, probability: 80, color: '#10B981' },
  ];

  const rentalStagesCreated: any[] = [];
  for (const stage of rentalStages) {
    const stageId = randomUUID();
    const created = await prisma.pipelineStage.upsert({
      where: { id: stageId },
      update: stage,
      create: {
        id: stageId,
        pipelineId: rentalPipeline.id,
        ...stage,
      },
    });
    rentalStagesCreated.push(created);
  }

  console.log(`✅ Created rental pipeline with ${rentalStages.length} stages`);

  // ============================================
  // DEALS
  // ============================================

  const dealsData = [
    {
      title: 'فيلا حي النرجس - مجموعة الراجحي',
      value: 3500000,
      pipelineId: mainPipeline.id,
      stageId: mainStagesCreated[4].id, // تفاوض
      contactId: contacts[0].id,
      companyId: companies[0].id,
      ownerId: salesRep1.id,
      probability: 70,
      expectedCloseDate: new Date('2024-04-15'),
      tags: ['فيلا', 'حي النرجس', 'أولوية عالية'],
    },
    {
      title: 'مجمع سكني - النخيل',
      value: 12000000,
      pipelineId: mainPipeline.id,
      stageId: mainStagesCreated[3].id, // عرض سعر
      contactId: contacts[2].id,
      companyId: companies[1].id,
      ownerId: salesRep2.id,
      probability: 50,
      expectedCloseDate: new Date('2024-05-30'),
      tags: ['مشروع كبير', 'مجمع سكني'],
    },
    {
      title: 'شقة حي الروضة',
      value: 850000,
      pipelineId: mainPipeline.id,
      stageId: mainStagesCreated[2].id, // معاينة
      contactId: contacts[4].id,
      ownerId: salesRep2.id,
      probability: 35,
      expectedCloseDate: new Date('2024-03-20'),
      tags: ['شقة'],
    },
    {
      title: 'أرض تجارية - الدمام',
      value: 5500000,
      pipelineId: mainPipeline.id,
      stageId: mainStagesCreated[5].id, // مراجعة العقد
      contactId: contacts[3].id,
      companyId: companies[2].id,
      ownerId: salesRep1.id,
      probability: 90,
      expectedCloseDate: new Date('2024-03-10'),
      tags: ['أرض', 'تجاري', 'إغلاق قريب'],
    },
    {
      title: 'برج استثماري - العليا',
      value: 45000000,
      pipelineId: mainPipeline.id,
      stageId: mainStagesCreated[1].id, // تواصل أولي
      contactId: contacts[6].id,
      companyId: companies[3].id,
      ownerId: salesManager.id,
      probability: 20,
      expectedCloseDate: new Date('2024-08-01'),
      tags: ['استثمار', 'برج', 'صفقة كبيرة'],
    },
    {
      title: 'دوبلكس حي الياسمين',
      value: 1800000,
      pipelineId: mainPipeline.id,
      stageId: mainStagesCreated[0].id, // عميل محتمل
      contactId: contacts[5].id,
      ownerId: salesRep1.id,
      probability: 10,
      tags: ['دوبلكس'],
    },
    // Rental deals
    {
      title: 'تأجير مكتب - حي العليا',
      value: 150000,
      pipelineId: rentalPipeline.id,
      stageId: rentalStagesCreated[2].id, // تقديم عرض
      contactId: contacts[1].id,
      companyId: companies[0].id,
      ownerId: salesRep1.id,
      probability: 50,
      expectedCloseDate: new Date('2024-03-25'),
      tags: ['تأجير', 'مكتب'],
    },
    {
      title: 'تأجير شقة مفروشة',
      value: 48000,
      pipelineId: rentalPipeline.id,
      stageId: rentalStagesCreated[1].id, // معاينة
      contactId: contacts[4].id,
      ownerId: salesRep2.id,
      probability: 30,
      tags: ['تأجير', 'شقة مفروشة'],
    },
    // Won deals
    {
      title: 'فيلا حي الملقا - تم البيع',
      value: 2800000,
      pipelineId: mainPipeline.id,
      stageId: mainStagesCreated[5].id,
      contactId: contacts[0].id,
      companyId: companies[0].id,
      ownerId: salesRep1.id,
      probability: 100,
      status: 'won',
      closedAt: new Date('2024-02-15'),
      tags: ['فيلا', 'تم البيع'],
    },
    // Lost deal
    {
      title: 'مجمع تجاري - ملغي',
      value: 8000000,
      pipelineId: mainPipeline.id,
      stageId: mainStagesCreated[4].id,
      contactId: contacts[2].id,
      companyId: companies[1].id,
      ownerId: salesRep2.id,
      probability: 0,
      status: 'lost',
      closedAt: new Date('2024-02-20'),
      lostReason: 'العميل اختار منافس آخر بسعر أقل',
      tags: ['ملغي'],
    },
  ];

  const deals: any[] = [];
  for (const dealData of dealsData) {
    const deal = await prisma.deal.create({
      data: {
        tenantId: tenant.id,
        currency: 'SAR',
        ...dealData,
      },
    });
    deals.push(deal);
  }

  console.log(`✅ Created ${deals.length} deals`);

  // ============================================
  // ACTIVITIES
  // ============================================

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const activitiesData = [
    // Completed activities
    {
      type: 'call',
      subject: 'مكالمة تعريفية',
      description: 'تم التواصل مع العميل وشرح العروض المتاحة',
      contactId: contacts[0].id,
      dealId: deals[0].id,
      createdById: salesRep1.id,
      isCompleted: true,
      completedAt: yesterday,
      outcome: 'العميل مهتم ويريد معاينة',
      duration: 15,
    },
    {
      type: 'meeting',
      subject: 'اجتماع تقديمي',
      description: 'عرض المشروع على فريق القرار',
      contactId: contacts[2].id,
      dealId: deals[1].id,
      createdById: salesRep2.id,
      isCompleted: true,
      completedAt: yesterday,
      outcome: 'طلبوا عرض سعر تفصيلي',
      duration: 60,
    },
    {
      type: 'site_visit',
      subject: 'معاينة الفيلا',
      description: 'معاينة فيلا حي النرجس مع العميل',
      contactId: contacts[0].id,
      dealId: deals[0].id,
      createdById: salesRep1.id,
      isCompleted: true,
      completedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      outcome: 'أعجب العميل بالموقع والتصميم',
      duration: 90,
    },
    {
      type: 'email',
      subject: 'إرسال عرض السعر',
      description: 'تم إرسال عرض السعر التفصيلي',
      contactId: contacts[2].id,
      dealId: deals[1].id,
      createdById: salesRep2.id,
      isCompleted: true,
      completedAt: yesterday,
    },
    // Due today
    {
      type: 'call',
      subject: 'متابعة عرض السعر',
      description: 'الاتصال للتأكد من استلام العرض ومناقشة التفاصيل',
      contactId: contacts[2].id,
      dealId: deals[1].id,
      createdById: salesRep2.id,
      dueDate: now,
    },
    {
      type: 'task',
      subject: 'تحضير العقد',
      description: 'إعداد مسودة العقد للمراجعة',
      contactId: contacts[3].id,
      dealId: deals[3].id,
      createdById: salesRep1.id,
      dueDate: now,
    },
    // Upcoming activities
    {
      type: 'meeting',
      subject: 'اجتماع التفاوض النهائي',
      description: 'مناقشة الشروط النهائية وتوقيع العقد',
      contactId: contacts[0].id,
      dealId: deals[0].id,
      createdById: salesRep1.id,
      dueDate: tomorrow,
      duration: 60,
    },
    {
      type: 'site_visit',
      subject: 'معاينة الشقة',
      description: 'معاينة شقة حي الروضة',
      contactId: contacts[4].id,
      dealId: deals[2].id,
      createdById: salesRep2.id,
      dueDate: tomorrow,
    },
    {
      type: 'call',
      subject: 'تواصل أولي مع المستثمر',
      description: 'مناقشة فرص الاستثمار المتاحة',
      contactId: contacts[6].id,
      dealId: deals[4].id,
      createdById: salesManager.id,
      dueDate: nextWeek,
    },
    // Overdue activities
    {
      type: 'call',
      subject: 'متابعة العميل',
      description: 'متابعة بعد المعاينة',
      contactId: contacts[5].id,
      dealId: deals[5].id,
      createdById: salesRep1.id,
      dueDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    // Notes
    {
      type: 'note',
      subject: 'ملاحظة مهمة',
      description: 'العميل يفضل التواصل عبر الواتساب في المساء',
      contactId: contacts[0].id,
      createdById: salesRep1.id,
    },
    {
      type: 'whatsapp',
      subject: 'رسالة واتساب',
      description: 'تم إرسال صور العقار',
      contactId: contacts[4].id,
      dealId: deals[2].id,
      createdById: salesRep2.id,
      isCompleted: true,
      completedAt: yesterday,
    },
  ];

  for (const activityData of activitiesData) {
    await prisma.activity.create({
      data: {
        tenantId: tenant.id,
        ...activityData,
      },
    });
  }

  console.log(`✅ Created ${activitiesData.length} activities`);

  // ============================================
  // PROJECTS & PRODUCTS
  // ============================================

  const projectsData = [
    // 1. الرياض - حي النرجس (سكني)
    {
      name: 'ضاحية النرجس السكنية',
      city: 'الرياض',
      district: 'حي النرجس',
      type: 'residential',
      description: 'مشروع سكني متكامل في قلب حي النرجس يضم فلل وشقق وتاون هاوس بتصاميم عصرية ومرافق خدمية متكاملة',
      totalUnits: 45,
      status: 'active',
      images: [],
      products: [
        { unitNumber: 'NRG-V01', type: 'villa', area: 350, bedrooms: 5, bathrooms: 5, floor: 0, price: 3200000, status: 'available', features: ['مسبح خاص', 'حديقة', 'مجلس خارجي', 'غرفة سائق', 'مصعد'] },
        { unitNumber: 'NRG-V02', type: 'villa', area: 400, bedrooms: 6, bathrooms: 6, floor: 0, price: 3800000, status: 'reserved', features: ['مسبح خاص', 'حديقة كبيرة', 'قبو', 'غرفة خادمة', 'مصعد'] },
        { unitNumber: 'NRG-V03', type: 'villa', area: 300, bedrooms: 4, bathrooms: 4, floor: 0, price: 2700000, status: 'available', features: ['حديقة', 'مجلس', 'غرفة سائق'] },
        { unitNumber: 'NRG-TH01', type: 'townhouse', area: 220, bedrooms: 4, bathrooms: 3, floor: 0, price: 1800000, status: 'available', features: ['حديقة خاصة', 'موقف سيارتين', 'تراس'] },
        { unitNumber: 'NRG-TH02', type: 'townhouse', area: 200, bedrooms: 3, bathrooms: 3, floor: 0, price: 1600000, status: 'sold', features: ['حديقة خاصة', 'موقف سيارتين'] },
        { unitNumber: 'NRG-A01', type: 'apartment', area: 150, bedrooms: 3, bathrooms: 2, floor: 2, price: 850000, status: 'available', features: ['بلكونة', 'مطبخ مجهز', 'موقف'] },
        { unitNumber: 'NRG-A02', type: 'apartment', area: 120, bedrooms: 2, bathrooms: 2, floor: 3, price: 680000, status: 'available', features: ['بلكونة', 'مطبخ مجهز'] },
        { unitNumber: 'NRG-A03', type: 'apartment', area: 180, bedrooms: 4, bathrooms: 3, floor: 1, price: 1050000, status: 'reserved', features: ['بلكونة كبيرة', 'مطبخ مجهز', 'غرفة خادمة'] },
      ],
    },
    // 2. الرياض - حي الملقا (سكني)
    {
      name: 'أبراج الملقا الفاخرة',
      city: 'الرياض',
      district: 'حي الملقا',
      type: 'residential',
      description: 'أبراج سكنية فاخرة في أرقى أحياء شمال الرياض مع إطلالات بانورامية وخدمات فندقية',
      totalUnits: 60,
      status: 'active',
      images: [],
      products: [
        { unitNumber: 'MLQ-A01', type: 'apartment', area: 200, bedrooms: 3, bathrooms: 3, floor: 10, price: 1500000, status: 'available', features: ['إطلالة بانورامية', 'مطبخ إيطالي', 'تكييف مركزي', 'موقفين'] },
        { unitNumber: 'MLQ-A02', type: 'apartment', area: 250, bedrooms: 4, bathrooms: 4, floor: 15, price: 2200000, status: 'available', features: ['إطلالة بانورامية', 'جاكوزي', 'غرفة خادمة', 'مطبخ إيطالي'] },
        { unitNumber: 'MLQ-A03', type: 'apartment', area: 160, bedrooms: 2, bathrooms: 2, floor: 5, price: 1100000, status: 'reserved', features: ['بلكونة', 'مطبخ مجهز', 'تكييف مركزي'] },
        { unitNumber: 'MLQ-A04', type: 'apartment', area: 300, bedrooms: 5, bathrooms: 4, floor: 20, price: 3500000, status: 'available', features: ['بنتهاوس', 'تراس خاص', 'مسبح خاص', 'إطلالة 360'] },
        { unitNumber: 'MLQ-F01', type: 'floor', area: 500, bedrooms: 6, bathrooms: 5, floor: 2, price: 4200000, status: 'available', features: ['دور كامل', 'مدخل خاص', 'حديقة سطح', 'مصعد خاص'] },
        { unitNumber: 'MLQ-F02', type: 'floor', area: 450, bedrooms: 5, bathrooms: 4, floor: 3, price: 3800000, status: 'sold', features: ['دور كامل', 'مدخل خاص', 'بلكونة واسعة'] },
      ],
    },
    // 3. جدة - حي الشاطئ (سكني)
    {
      name: 'مساكن الشاطئ البحرية',
      city: 'جدة',
      district: 'حي الشاطئ',
      type: 'residential',
      description: 'مشروع سكني فاخر على كورنيش جدة بإطلالات بحرية خلابة وتصاميم مستوحاة من الطراز المتوسطي',
      totalUnits: 35,
      status: 'active',
      images: [],
      products: [
        { unitNumber: 'SHT-V01', type: 'villa', area: 500, bedrooms: 6, bathrooms: 7, floor: 0, price: 8500000, status: 'available', features: ['إطلالة بحرية', 'مسبح خاص', 'حديقة', 'مرسى قوارب', 'مصعد'] },
        { unitNumber: 'SHT-V02', type: 'villa', area: 450, bedrooms: 5, bathrooms: 6, floor: 0, price: 7200000, status: 'reserved', features: ['إطلالة بحرية', 'مسبح خاص', 'حديقة كبيرة'] },
        { unitNumber: 'SHT-TH01', type: 'townhouse', area: 280, bedrooms: 4, bathrooms: 4, floor: 0, price: 3500000, status: 'available', features: ['إطلالة بحرية', 'تراس', 'حديقة خاصة', 'موقف مزدوج'] },
        { unitNumber: 'SHT-A01', type: 'apartment', area: 220, bedrooms: 3, bathrooms: 3, floor: 8, price: 2800000, status: 'available', features: ['إطلالة بحرية', 'بلكونة واسعة', 'مطبخ فاخر', 'جيم مشترك'] },
        { unitNumber: 'SHT-A02', type: 'apartment', area: 180, bedrooms: 3, bathrooms: 2, floor: 5, price: 2200000, status: 'available', features: ['إطلالة بحرية', 'بلكونة', 'مطبخ مجهز'] },
        { unitNumber: 'SHT-A03', type: 'apartment', area: 140, bedrooms: 2, bathrooms: 2, floor: 3, price: 1600000, status: 'sold', features: ['بلكونة', 'مطبخ مجهز', 'موقف'] },
      ],
    },
    // 4. جدة - حي الحمراء (مختلط)
    {
      name: 'واحة الحمراء',
      city: 'جدة',
      district: 'حي الحمراء',
      type: 'mixed',
      description: 'مشروع متعدد الاستخدامات يجمع بين الوحدات السكنية والمحلات التجارية والمكاتب في قلب جدة',
      totalUnits: 50,
      status: 'active',
      images: [],
      products: [
        { unitNumber: 'HMR-A01', type: 'apartment', area: 170, bedrooms: 3, bathrooms: 2, floor: 5, price: 1200000, status: 'available', features: ['إطلالة على الحديقة', 'مطبخ مجهز', 'نادي صحي'] },
        { unitNumber: 'HMR-A02', type: 'apartment', area: 130, bedrooms: 2, bathrooms: 2, floor: 3, price: 850000, status: 'available', features: ['بلكونة', 'مطبخ مجهز'] },
        { unitNumber: 'HMR-TH01', type: 'townhouse', area: 240, bedrooms: 4, bathrooms: 3, floor: 0, price: 2100000, status: 'reserved', features: ['حديقة خاصة', 'تراس سطح', 'موقف مزدوج'] },
        { unitNumber: 'HMR-F01', type: 'floor', area: 400, bedrooms: 0, bathrooms: 2, floor: 1, price: 3200000, status: 'available', features: ['دور تجاري', 'واجهة زجاجية', 'مدخل مستقل', 'مواقف خاصة'] },
        { unitNumber: 'HMR-L01', type: 'land', area: 600, bedrooms: 0, bathrooms: 0, floor: 0, price: 4500000, status: 'available', features: ['أرض تجارية', 'شارعين', 'زاوية', 'صك إلكتروني'] },
        { unitNumber: 'HMR-V01', type: 'villa', area: 380, bedrooms: 5, bathrooms: 5, floor: 0, price: 3600000, status: 'available', features: ['حديقة', 'مسبح', 'مجلس خارجي', 'غرفة سائق'] },
      ],
    },
    // 5. الدمام - حي الشاطئ الشرقي (سكني)
    {
      name: 'إشراقة الشاطئ الشرقي',
      city: 'الدمام',
      district: 'حي الشاطئ الشرقي',
      type: 'residential',
      description: 'مجمع سكني عصري في حي الشاطئ الشرقي بالدمام مع إطلالات على الخليج العربي ومرافق ترفيهية',
      totalUnits: 40,
      status: 'active',
      images: [],
      products: [
        { unitNumber: 'DSH-V01', type: 'villa', area: 320, bedrooms: 5, bathrooms: 4, floor: 0, price: 2800000, status: 'available', features: ['إطلالة بحرية', 'مسبح', 'حديقة', 'مجلس'] },
        { unitNumber: 'DSH-V02', type: 'villa', area: 280, bedrooms: 4, bathrooms: 4, floor: 0, price: 2400000, status: 'sold', features: ['حديقة', 'مجلس خارجي', 'غرفة سائق'] },
        { unitNumber: 'DSH-TH01', type: 'townhouse', area: 200, bedrooms: 3, bathrooms: 3, floor: 0, price: 1500000, status: 'available', features: ['حديقة خاصة', 'تراس', 'موقف سيارتين'] },
        { unitNumber: 'DSH-A01', type: 'apartment', area: 160, bedrooms: 3, bathrooms: 2, floor: 6, price: 900000, status: 'available', features: ['إطلالة بحرية', 'بلكونة', 'مطبخ مجهز'] },
        { unitNumber: 'DSH-A02', type: 'apartment', area: 120, bedrooms: 2, bathrooms: 2, floor: 4, price: 650000, status: 'available', features: ['بلكونة', 'مطبخ مجهز', 'موقف'] },
        { unitNumber: 'DSH-L01', type: 'land', area: 450, bedrooms: 0, bathrooms: 0, floor: 0, price: 1800000, status: 'available', features: ['أرض سكنية', 'شارع 20م', 'صك إلكتروني'] },
      ],
    },
    // 6. الخبر - حي الراكة (تجاري)
    {
      name: 'مركز الراكة التجاري',
      city: 'الخبر',
      district: 'حي الراكة',
      type: 'commercial',
      description: 'مركز تجاري ومكتبي حديث في حي الراكة بالخبر على الشارع الرئيسي مع مواقف واسعة',
      totalUnits: 30,
      status: 'active',
      images: [],
      products: [
        { unitNumber: 'RKH-F01', type: 'floor', area: 600, bedrooms: 0, bathrooms: 4, floor: 1, price: 5500000, status: 'available', features: ['دور مكتبي', 'تشطيب فاخر', 'تكييف مركزي', 'نظام أمني'] },
        { unitNumber: 'RKH-F02', type: 'floor', area: 600, bedrooms: 0, bathrooms: 4, floor: 2, price: 5200000, status: 'reserved', features: ['دور مكتبي', 'تشطيب فاخر', 'تكييف مركزي'] },
        { unitNumber: 'RKH-F03', type: 'floor', area: 550, bedrooms: 0, bathrooms: 3, floor: 3, price: 4800000, status: 'available', features: ['دور مكتبي', 'تكييف مركزي', 'إطلالة'] },
        { unitNumber: 'RKH-L01', type: 'land', area: 1200, bedrooms: 0, bathrooms: 0, floor: 0, price: 12000000, status: 'available', features: ['أرض تجارية', 'شارعين 40م', 'زاوية', 'على الطريق الرئيسي'] },
        { unitNumber: 'RKH-L02', type: 'land', area: 800, bedrooms: 0, bathrooms: 0, floor: 0, price: 7500000, status: 'available', features: ['أرض تجارية', 'شارع 30م', 'موقع مميز'] },
      ],
    },
    // 7. مكة المكرمة - حي العوالي (سكني)
    {
      name: 'ديار العوالي',
      city: 'مكة المكرمة',
      district: 'حي العوالي',
      type: 'residential',
      description: 'مشروع سكني راقي في حي العوالي بمكة المكرمة قريب من الحرم الشريف بتصاميم إسلامية أصيلة',
      totalUnits: 55,
      status: 'active',
      images: [],
      products: [
        { unitNumber: 'AWL-V01', type: 'villa', area: 380, bedrooms: 5, bathrooms: 5, floor: 0, price: 4500000, status: 'available', features: ['قريب من الحرم', 'تصميم إسلامي', 'حديقة', 'مصعد', 'مسبح'] },
        { unitNumber: 'AWL-V02', type: 'villa', area: 300, bedrooms: 4, bathrooms: 4, floor: 0, price: 3500000, status: 'available', features: ['قريب من الحرم', 'تصميم إسلامي', 'حديقة'] },
        { unitNumber: 'AWL-A01', type: 'apartment', area: 180, bedrooms: 3, bathrooms: 2, floor: 4, price: 1200000, status: 'available', features: ['إطلالة على الحرم', 'مصعد', 'موقف', 'حارس أمن'] },
        { unitNumber: 'AWL-A02', type: 'apartment', area: 140, bedrooms: 2, bathrooms: 2, floor: 6, price: 950000, status: 'reserved', features: ['إطلالة على الحرم', 'مصعد', 'مطبخ مجهز'] },
        { unitNumber: 'AWL-A03', type: 'apartment', area: 100, bedrooms: 1, bathrooms: 1, floor: 2, price: 650000, status: 'available', features: ['استوديو فاخر', 'مفروش بالكامل', 'موقف'] },
        { unitNumber: 'AWL-TH01', type: 'townhouse', area: 250, bedrooms: 4, bathrooms: 3, floor: 0, price: 2800000, status: 'available', features: ['تصميم إسلامي', 'حديقة خاصة', 'تراس سطح'] },
        { unitNumber: 'AWL-F01', type: 'floor', area: 350, bedrooms: 4, bathrooms: 3, floor: 1, price: 2200000, status: 'sold', features: ['دور كامل', 'مدخل خاص', 'حديقة'] },
      ],
    },
    // 8. المدينة المنورة - حي العزيزية (مختلط)
    {
      name: 'بوابة العزيزية',
      city: 'المدينة المنورة',
      district: 'حي العزيزية',
      type: 'mixed',
      description: 'مشروع متكامل في حي العزيزية قرب المسجد النبوي يجمع بين السكن والتجارة والضيافة',
      totalUnits: 70,
      status: 'active',
      images: [],
      products: [
        { unitNumber: 'AZZ-A01', type: 'apartment', area: 160, bedrooms: 3, bathrooms: 2, floor: 5, price: 1100000, status: 'available', features: ['قريب من الحرم النبوي', 'مصعد', 'تكييف مركزي', 'حارس'] },
        { unitNumber: 'AZZ-A02', type: 'apartment', area: 120, bedrooms: 2, bathrooms: 2, floor: 3, price: 780000, status: 'available', features: ['قريب من الحرم النبوي', 'مصعد', 'مطبخ مجهز'] },
        { unitNumber: 'AZZ-A03', type: 'apartment', area: 200, bedrooms: 4, bathrooms: 3, floor: 8, price: 1500000, status: 'reserved', features: ['إطلالة على الحرم', 'مصعد', 'جاكوزي'] },
        { unitNumber: 'AZZ-F01', type: 'floor', area: 450, bedrooms: 0, bathrooms: 3, floor: 1, price: 3800000, status: 'available', features: ['دور تجاري', 'واجهة رئيسية', 'مدخل مستقل'] },
        { unitNumber: 'AZZ-V01', type: 'villa', area: 350, bedrooms: 5, bathrooms: 5, floor: 0, price: 3900000, status: 'available', features: ['قريب من الحرم', 'حديقة', 'مسبح', 'مصعد'] },
        { unitNumber: 'AZZ-L01', type: 'land', area: 500, bedrooms: 0, bathrooms: 0, floor: 0, price: 5500000, status: 'available', features: ['أرض تجارية', 'شارعين', 'قريب من الحرم', 'صك إلكتروني'] },
        { unitNumber: 'AZZ-TH01', type: 'townhouse', area: 230, bedrooms: 3, bathrooms: 3, floor: 0, price: 1900000, status: 'available', features: ['حديقة خاصة', 'تصميم عصري', 'موقف مزدوج'] },
      ],
    },
    // 9. أبها - حي المنسك (سكني)
    {
      name: 'مرتفعات المنسك',
      city: 'أبها',
      district: 'حي المنسك',
      type: 'residential',
      description: 'مشروع سكني في أعالي مدينة أبها بين الغيوم والطبيعة الخلابة مع طقس معتدل طوال العام',
      totalUnits: 30,
      status: 'active',
      images: [],
      products: [
        { unitNumber: 'MNS-V01', type: 'villa', area: 400, bedrooms: 5, bathrooms: 5, floor: 0, price: 2200000, status: 'available', features: ['إطلالة جبلية', 'حديقة واسعة', 'مدفأة', 'شرفة بانورامية'] },
        { unitNumber: 'MNS-V02', type: 'villa', area: 320, bedrooms: 4, bathrooms: 4, floor: 0, price: 1800000, status: 'available', features: ['إطلالة جبلية', 'حديقة', 'مدفأة'] },
        { unitNumber: 'MNS-TH01', type: 'townhouse', area: 200, bedrooms: 3, bathrooms: 3, floor: 0, price: 1200000, status: 'reserved', features: ['إطلالة طبيعية', 'حديقة خاصة', 'تراس'] },
        { unitNumber: 'MNS-A01', type: 'apartment', area: 140, bedrooms: 2, bathrooms: 2, floor: 3, price: 550000, status: 'available', features: ['إطلالة جبلية', 'بلكونة', 'مطبخ مجهز'] },
        { unitNumber: 'MNS-A02', type: 'apartment', area: 170, bedrooms: 3, bathrooms: 2, floor: 5, price: 700000, status: 'available', features: ['إطلالة بانورامية', 'بلكونة واسعة', 'تكييف'] },
        { unitNumber: 'MNS-L01', type: 'land', area: 700, bedrooms: 0, bathrooms: 0, floor: 0, price: 980000, status: 'available', features: ['أرض سكنية', 'إطلالة جبلية', 'شارع 15م', 'صك إلكتروني'] },
      ],
    },
  ];

  const projects: any[] = [];
  for (const projectData of projectsData) {
    const { products: productsData, ...projectInfo } = projectData;
    const project = await prisma.project.create({
      data: {
        tenantId: tenant.id,
        ...projectInfo,
      },
    });
    projects.push(project);

    // Create products for this project
    for (const productData of productsData) {
      await prisma.product.create({
        data: {
          tenantId: tenant.id,
          projectId: project.id,
          currency: 'SAR',
          ...productData,
        },
      });
    }

    console.log(`✅ Created project: ${project.name} with ${productsData.length} products`);
  }

  const totalProducts = projectsData.reduce((sum, p) => sum + p.products.length, 0);
  console.log(`✅ Created ${projects.length} projects with ${totalProducts} total products`);

  // ============================================
  // LEADS
  // ============================================

  const leadsData = [
    {
      firstName: 'فهد',
      lastName: 'السبيعي',
      phone: '+966556789012',
      whatsapp: '+966556789012',
      source: 'whatsapp_bot',
      status: 'qualified',
      score: 85,
      scoreGrade: 'A',
      propertyType: 'villa',
      budget: 2500000,
      timeline: '1-3_months',
      location: 'الرياض - حي النرجس',
      financingNeeded: true,
      ownerId: salesRep1.id,
    },
    {
      firstName: 'منى',
      lastName: 'الغامدي',
      phone: '+966557890123',
      source: 'voice_bot',
      status: 'new',
      score: 60,
      scoreGrade: 'B',
      propertyType: 'apartment',
      budget: 800000,
      timeline: '3-6_months',
      location: 'جدة - حي الروضة',
      ownerId: salesRep2.id,
    },
    {
      firstName: 'عبدالرحمن',
      lastName: 'الشهري',
      email: 'abdulrahman.sh@gmail.com',
      phone: '+966558901234',
      whatsapp: '+966558901234',
      source: 'web_form',
      status: 'contacted',
      score: 72,
      scoreGrade: 'B',
      propertyType: 'land',
      budget: 5000000,
      timeline: '6-12_months',
      location: 'الرياض - شمال المدينة',
      ownerId: salesRep1.id,
    },
    {
      firstName: 'هند',
      phone: '+966551234000',
      source: 'whatsapp_bot',
      status: 'new',
      score: 45,
      scoreGrade: 'C',
      propertyType: 'apartment',
      budget: 600000,
      location: 'الدمام',
    },
    {
      firstName: 'ماجد',
      lastName: 'العسيري',
      phone: '+966552345000',
      whatsapp: '+966552345000',
      source: 'instagram',
      status: 'qualified',
      score: 90,
      scoreGrade: 'A',
      propertyType: 'villa',
      budget: 4000000,
      timeline: '1-3_months',
      location: 'الرياض - حي الملقا',
      financingNeeded: false,
      ownerId: salesManager.id,
      tags: ['VIP', 'جاهز للشراء'],
    },
    {
      firstName: 'لمى',
      lastName: 'الحارثي',
      email: 'lama.h@yahoo.com',
      phone: '+966553456000',
      source: 'referral',
      status: 'contacted',
      score: 65,
      scoreGrade: 'B',
      propertyType: 'duplex',
      budget: 1800000,
      timeline: '3-6_months',
      location: 'جدة - حي الشاطئ',
      ownerId: salesRep2.id,
    },
  ];

  for (const leadData of leadsData) {
    await prisma.lead.create({
      data: {
        tenantId: tenant.id,
        ...leadData,
      },
    });
  }

  console.log(`✅ Created ${leadsData.length} leads`);

  // ============================================
  // SUMMARY
  // ============================================

  console.log('');
  console.log('🎉 Seeding completed!');
  console.log('');
  console.log('📊 Summary:');
  console.log(`   • 1 Tenant`);
  console.log(`   • 4 Users (1 admin, 1 manager, 2 sales reps)`);
  console.log(`   • ${companies.length} Companies`);
  console.log(`   • ${contacts.length} Contacts`);
  console.log(`   • 2 Pipelines (${mainStages.length + rentalStages.length} stages total)`);
  console.log(`   • ${deals.length} Deals`);
  console.log(`   • ${activitiesData.length} Activities`);
  console.log(`   • ${projects.length} Projects with ${totalProducts} Products`);
  console.log(`   • ${leadsData.length} Leads`);
  console.log('');
  console.log('📋 Test credentials:');
  console.log('   Admin:         admin@saddah.io / Admin@123');
  console.log('   Sales Manager: sara@saddah.io / Manager@123');
  console.log('   Sales Rep 1:   ahmad@saddah.io / Sales@123');
  console.log('   Sales Rep 2:   khalid@saddah.io / Sales@123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
