// src/modules/integrations/whatsapp/whatsapp-contact-sync.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { Contact, Lead, Conversation } from '@prisma/client';

/**
 * Result of contact lookup/creation
 */
export interface ContactSyncResult {
  type: 'contact' | 'lead' | 'created_lead';
  contact?: Contact;
  lead?: Lead;
  isNew: boolean;
  linkedToConversation: boolean;
}

/**
 * Contact info extracted from WhatsApp
 */
export interface WhatsAppContactInfo {
  phoneNumber: string;
  name?: string;
  profileName?: string;
}

/**
 * Events emitted by the contact sync service
 */
export const ContactSyncEvents = {
  CONTACT_FOUND: 'whatsapp.contact.found',
  LEAD_FOUND: 'whatsapp.contact.lead_found',
  LEAD_CREATED: 'whatsapp.contact.lead_created',
  CONVERSATION_LINKED: 'whatsapp.contact.conversation_linked',
} as const;

@Injectable()
export class WhatsAppContactSyncService {
  private readonly logger = new Logger(WhatsAppContactSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Find or create a contact/lead from WhatsApp phone number
   * This is the main entry point for contact sync
   */
  async findOrCreateFromWhatsApp(
    tenantId: string,
    phoneNumber: string,
    name?: string,
    conversationId?: string,
  ): Promise<ContactSyncResult> {
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

    this.logger.debug(
      `Looking up contact for WhatsApp: ${normalizedPhone} (tenant: ${tenantId})`,
    );

    // 1. Try to find existing Contact by WhatsApp number
    let contact = await this.findContactByWhatsApp(tenantId, normalizedPhone);

    if (contact) {
      this.logger.log(`Found existing contact: ${contact.id}`);

      // Link to conversation if provided
      if (conversationId) {
        await this.linkConversationToContact(conversationId, contact.id);
      }

      this.eventEmitter.emit(ContactSyncEvents.CONTACT_FOUND, {
        tenantId,
        contactId: contact.id,
        phoneNumber: normalizedPhone,
      });

      return {
        type: 'contact',
        contact,
        isNew: false,
        linkedToConversation: !!conversationId,
      };
    }

    // 2. Try to find Contact by phone number (might not have WhatsApp set)
    contact = await this.findContactByPhone(tenantId, normalizedPhone);

    if (contact) {
      // Update the contact's WhatsApp field
      contact = await this.updateContactWhatsApp(contact.id, normalizedPhone);

      this.logger.log(`Found contact by phone, updated WhatsApp: ${contact.id}`);

      if (conversationId) {
        await this.linkConversationToContact(conversationId, contact.id);
      }

      this.eventEmitter.emit(ContactSyncEvents.CONTACT_FOUND, {
        tenantId,
        contactId: contact.id,
        phoneNumber: normalizedPhone,
        whatsappUpdated: true,
      });

      return {
        type: 'contact',
        contact,
        isNew: false,
        linkedToConversation: !!conversationId,
      };
    }

    // 3. Try to find existing Lead
    let lead = await this.findLeadByPhone(tenantId, normalizedPhone);

    if (lead) {
      // Update lead's WhatsApp field if not set
      if (!lead.whatsapp) {
        lead = await this.updateLeadWhatsApp(lead.id, normalizedPhone);
      }

      this.logger.log(`Found existing lead: ${lead.id}`);

      this.eventEmitter.emit(ContactSyncEvents.LEAD_FOUND, {
        tenantId,
        leadId: lead.id,
        phoneNumber: normalizedPhone,
      });

      return {
        type: 'lead',
        lead,
        isNew: false,
        linkedToConversation: false, // Leads don't link to conversations directly
      };
    }

    // 4. Create new Lead
    lead = await this.createLeadFromWhatsApp(tenantId, normalizedPhone, name);

    this.logger.log(`Created new lead from WhatsApp: ${lead.id}`);

    this.eventEmitter.emit(ContactSyncEvents.LEAD_CREATED, {
      tenantId,
      leadId: lead.id,
      phoneNumber: normalizedPhone,
      name,
    });

    return {
      type: 'created_lead',
      lead,
      isNew: true,
      linkedToConversation: false,
    };
  }

  /**
   * Sync contact info from conversation's qualification data
   * Call this after qualification is complete to update lead/contact info
   */
  async syncFromQualificationData(
    conversationId: string,
    qualificationData: any,
  ): Promise<void> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        tenantId: true,
        channelId: true,
        contactId: true,
      },
    });

    if (!conversation) {
      return;
    }

    const phoneNumber = this.normalizePhoneNumber(conversation.channelId);

    // Find the lead for this phone number
    const lead = await this.findLeadByPhone(conversation.tenantId, phoneNumber);

    if (lead) {
      // Update lead with qualification data
      await this.prisma.lead.update({
        where: { id: lead.id },
        data: {
          firstName: qualificationData.name || lead.firstName,
          propertyType: qualificationData.propertyType || lead.propertyType,
          budget: qualificationData.budget?.max || lead.budget,
          location: qualificationData.location?.city || lead.location,
          timeline: qualificationData.timeline || lead.timeline,
          financingNeeded: qualificationData.financing ?? lead.financingNeeded,
          score: qualificationData.qualificationScore || lead.score,
          status: qualificationData.qualifiedAt ? 'qualified' : lead.status,
        },
      });

      this.logger.log(`Updated lead ${lead.id} with qualification data`);
    }
  }

  // ============================================
  // LOOKUP METHODS
  // ============================================

  /**
   * Find contact by WhatsApp number
   */
  async findContactByWhatsApp(
    tenantId: string,
    whatsappNumber: string,
  ): Promise<Contact | null> {
    const normalized = this.normalizePhoneNumber(whatsappNumber);

    return this.prisma.contact.findFirst({
      where: {
        tenantId,
        whatsapp: normalized,
        isActive: true,
      },
    });
  }

  /**
   * Find contact by phone number
   */
  async findContactByPhone(
    tenantId: string,
    phoneNumber: string,
  ): Promise<Contact | null> {
    const normalized = this.normalizePhoneNumber(phoneNumber);

    // Try multiple formats
    const formats = this.getPhoneFormats(normalized);

    return this.prisma.contact.findFirst({
      where: {
        tenantId,
        isActive: true,
        OR: formats.map((phone) => ({ phone })),
      },
    });
  }

  /**
   * Find lead by phone number
   */
  async findLeadByPhone(
    tenantId: string,
    phoneNumber: string,
  ): Promise<Lead | null> {
    const normalized = this.normalizePhoneNumber(phoneNumber);
    const formats = this.getPhoneFormats(normalized);

    return this.prisma.lead.findFirst({
      where: {
        tenantId,
        status: { not: 'converted' },
        OR: [
          ...formats.map((phone) => ({ phone })),
          ...formats.map((whatsapp) => ({ whatsapp })),
        ],
      },
    });
  }

  /**
   * Find lead by WhatsApp number specifically
   */
  async findLeadByWhatsApp(
    tenantId: string,
    whatsappNumber: string,
  ): Promise<Lead | null> {
    const normalized = this.normalizePhoneNumber(whatsappNumber);

    return this.prisma.lead.findFirst({
      where: {
        tenantId,
        whatsapp: normalized,
        status: { not: 'converted' },
      },
    });
  }

  // ============================================
  // CREATE/UPDATE METHODS
  // ============================================

  /**
   * Create a new lead from WhatsApp
   */
  async createLeadFromWhatsApp(
    tenantId: string,
    phoneNumber: string,
    name?: string,
  ): Promise<Lead> {
    const normalized = this.normalizePhoneNumber(phoneNumber);

    // Parse name if provided
    const { firstName, lastName } = this.parseName(name);

    return this.prisma.lead.create({
      data: {
        tenantId,
        firstName: firstName || 'عميل واتساب',
        lastName,
        phone: normalized,
        whatsapp: normalized,
        source: 'whatsapp_bot',
        status: 'new',
        score: 0,
      },
    });
  }

  /**
   * Update contact's WhatsApp number
   */
  async updateContactWhatsApp(
    contactId: string,
    whatsappNumber: string,
  ): Promise<Contact> {
    const normalized = this.normalizePhoneNumber(whatsappNumber);

    return this.prisma.contact.update({
      where: { id: contactId },
      data: { whatsapp: normalized },
    });
  }

  /**
   * Update lead's WhatsApp number
   */
  async updateLeadWhatsApp(
    leadId: string,
    whatsappNumber: string,
  ): Promise<Lead> {
    const normalized = this.normalizePhoneNumber(whatsappNumber);

    return this.prisma.lead.update({
      where: { id: leadId },
      data: { whatsapp: normalized },
    });
  }

  /**
   * Link a conversation to a contact
   */
  async linkConversationToContact(
    conversationId: string,
    contactId: string,
  ): Promise<Conversation> {
    const updated = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { contactId },
    });

    this.eventEmitter.emit(ContactSyncEvents.CONVERSATION_LINKED, {
      conversationId,
      contactId,
    });

    return updated;
  }

  // ============================================
  // MERGE & DUPLICATE DETECTION
  // ============================================

  /**
   * Find potential duplicate contacts/leads for a phone number
   */
  async findDuplicates(
    tenantId: string,
    phoneNumber: string,
  ): Promise<{
    contacts: Contact[];
    leads: Lead[];
  }> {
    const normalized = this.normalizePhoneNumber(phoneNumber);
    const formats = this.getPhoneFormats(normalized);

    const [contacts, leads] = await Promise.all([
      this.prisma.contact.findMany({
        where: {
          tenantId,
          isActive: true,
          OR: [
            ...formats.map((phone) => ({ phone })),
            ...formats.map((whatsapp) => ({ whatsapp })),
          ],
        },
      }),
      this.prisma.lead.findMany({
        where: {
          tenantId,
          status: { not: 'converted' },
          OR: [
            ...formats.map((phone) => ({ phone })),
            ...formats.map((whatsapp) => ({ whatsapp })),
          ],
        },
      }),
    ]);

    return { contacts, leads };
  }

  /**
   * Merge a lead into an existing contact
   */
  async mergeLeadIntoContact(
    leadId: string,
    contactId: string,
  ): Promise<Contact> {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      throw new Error('Contact not found');
    }

    // Update contact with lead data (only fill in missing fields)
    const updatedContact = await this.prisma.contact.update({
      where: { id: contactId },
      data: {
        phone: contact.phone || lead.phone,
        whatsapp: contact.whatsapp || lead.whatsapp,
        // Merge tags
        tags: [...new Set([...contact.tags, ...lead.tags])],
      },
    });

    // Mark lead as converted
    await this.prisma.lead.update({
      where: { id: leadId },
      data: {
        status: 'converted',
        convertedAt: new Date(),
        convertedToContactId: contactId,
      },
    });

    this.logger.log(`Merged lead ${leadId} into contact ${contactId}`);

    return updatedContact;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Normalize phone number to standard format
   */
  normalizePhoneNumber(phone: string): string {
    if (!phone) return '';

    // Remove all non-digit characters except +
    let normalized = phone.replace(/[^\d+]/g, '');

    // Handle WhatsApp format (whatsapp:+1234567890)
    if (normalized.startsWith('whatsapp:')) {
      normalized = normalized.replace('whatsapp:', '');
    }

    // Ensure it starts with +
    if (!normalized.startsWith('+') && normalized.length > 0) {
      // Assume Saudi Arabia if starts with 05 or 5
      if (normalized.startsWith('05')) {
        normalized = '+966' + normalized.substring(1);
      } else if (normalized.startsWith('5') && normalized.length === 9) {
        normalized = '+966' + normalized;
      } else if (normalized.startsWith('966')) {
        normalized = '+' + normalized;
      } else {
        normalized = '+' + normalized;
      }
    }

    return normalized;
  }

  /**
   * Get various phone number formats for matching
   */
  private getPhoneFormats(normalizedPhone: string): string[] {
    const formats = [normalizedPhone];

    // If it's a Saudi number, add alternate formats
    if (normalizedPhone.startsWith('+966')) {
      const localPart = normalizedPhone.substring(4);
      formats.push('0' + localPart); // 05XXXXXXXX
      formats.push(localPart); // 5XXXXXXXX
      formats.push('966' + localPart); // 9665XXXXXXXX
    }

    return formats;
  }

  /**
   * Parse a name into first and last name
   */
  private parseName(name?: string): { firstName?: string; lastName?: string } {
    if (!name || !name.trim()) {
      return {};
    }

    const parts = name.trim().split(/\s+/);

    if (parts.length === 1) {
      return { firstName: parts[0] };
    }

    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(' '),
    };
  }

  /**
   * Get contact info for display in conversation
   */
  async getContactInfoForConversation(
    tenantId: string,
    channelId: string,
  ): Promise<{
    type: 'contact' | 'lead' | 'unknown';
    id?: string;
    name?: string;
    phone?: string;
    email?: string;
    status?: string;
  }> {
    const normalizedPhone = this.normalizePhoneNumber(channelId);

    // Try contact first
    const contact = await this.findContactByWhatsApp(tenantId, normalizedPhone)
      || await this.findContactByPhone(tenantId, normalizedPhone);

    if (contact) {
      return {
        type: 'contact',
        id: contact.id,
        name: `${contact.firstName} ${contact.lastName}`.trim(),
        phone: contact.phone || undefined,
        email: contact.email || undefined,
      };
    }

    // Try lead
    const lead = await this.findLeadByPhone(tenantId, normalizedPhone);

    if (lead) {
      return {
        type: 'lead',
        id: lead.id,
        name: `${lead.firstName} ${lead.lastName || ''}`.trim(),
        phone: lead.phone || undefined,
        email: lead.email || undefined,
        status: lead.status,
      };
    }

    return {
      type: 'unknown',
      phone: normalizedPhone,
    };
  }
}
