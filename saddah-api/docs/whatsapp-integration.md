# WhatsApp Integration Guide

This document provides a comprehensive guide to the WhatsApp integration in SADDAH CRM.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Provider Comparison](#provider-comparison)
4. [Setup Guide - Twilio](#setup-guide---twilio)
5. [Setup Guide - Meta Business API](#setup-guide---meta-business-api)
6. [Webhook Configuration](#webhook-configuration)
7. [Environment Variables](#environment-variables)
8. [Template Approval Process](#template-approval-process)
9. [API Reference](#api-reference)

---

## Overview

SADDAH CRM integrates with WhatsApp Business API to enable automated lead qualification through conversational AI. The system supports both **Twilio** and **Meta Business API** as WhatsApp providers.

### Key Features

- **Automated Lead Qualification**: AI-powered bot that qualifies leads in Saudi Arabic dialect
- **Multi-Provider Support**: Choose between Twilio or Meta Business API
- **Real-time Updates**: WebSocket integration for live conversation updates
- **Media Support**: Send and receive images, documents, audio, and video
- **Template Messages**: Support for WhatsApp-approved message templates
- **Rate Limiting**: Per-tenant and per-contact rate limiting
- **Delivery Tracking**: Track message delivery status (sent, delivered, read)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SADDAH CRM                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Webhook    │───▶│  Transformer │───▶│  Bot Service │      │
│  │  Controller  │    │   Service    │    │              │      │
│  └──────────────┘    └──────────────┘    └──────┬───────┘      │
│         ▲                                        │              │
│         │                                        ▼              │
│  ┌──────┴───────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Signature  │    │    State     │◀───│  LLM Service │      │
│  │    Guard     │    │   Machine    │    │   (GPT-4)    │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                                                  │              │
│  ┌──────────────┐    ┌──────────────┐           │              │
│  │    Sender    │◀───│  Bull Queue  │◀──────────┘              │
│  │   Service    │    │              │                          │
│  └──────┬───────┘    └──────────────┘                          │
│         │                                                       │
│         ▼                                                       │
│  ┌──────────────┐                                              │
│  │   Adapter    │  (Twilio / Meta)                             │
│  │   Factory    │                                              │
│  └──────┬───────┘                                              │
│         │                                                       │
└─────────┼───────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    WhatsApp Business API                         │
│                   (Twilio / Meta Cloud)                          │
└─────────────────────────────────────────────────────────────────┘
```

### Components

| Component | Description |
|-----------|-------------|
| **Webhook Controller** | Receives incoming messages and status updates from WhatsApp |
| **Signature Guard** | Validates webhook signatures (Twilio/Meta) |
| **Transformer Service** | Converts between provider formats and internal format |
| **Bot Service** | Orchestrates AI-powered conversation flow |
| **State Machine** | Manages qualification states and transitions |
| **LLM Service** | Generates responses using GPT-4 with Saudi dialect |
| **Sender Service** | Queues and sends outbound messages |
| **Bull Queue** | Async message processing with retry logic |
| **Adapter Factory** | Creates provider-specific adapters (Twilio/Meta) |

---

## Provider Comparison

| Feature | Twilio | Meta Business API |
|---------|--------|-------------------|
| **Pricing** | Per-message pricing | Meta pricing + hosting |
| **Setup Complexity** | Simple (managed) | Complex (self-hosted or Cloud API) |
| **Sandbox Available** | Yes (free) | Yes (with test numbers) |
| **Media Hosting** | Twilio CDN | Meta CDN or self-hosted |
| **Template Management** | Via API or Console | Via Business Manager |
| **Webhook Security** | HMAC-SHA1 | HMAC-SHA256 |
| **Rate Limits** | Account-based | Tier-based (quality rating) |
| **Best For** | Quick start, small-medium scale | Large scale, cost optimization |

### Recommendation

- **Development/Testing**: Use Twilio Sandbox
- **Production (Small-Medium)**: Twilio
- **Production (Large Scale)**: Meta Business API (Cloud API)

---

## Setup Guide - Twilio

### Prerequisites

1. Twilio account (https://www.twilio.com)
2. Twilio Phone Number with WhatsApp capability
3. Approved WhatsApp Business Profile

### Step 1: Create Twilio Account

1. Sign up at https://www.twilio.com/try-twilio
2. Verify your email and phone number
3. Complete account setup

### Step 2: Enable WhatsApp Sandbox (Development)

1. Go to **Messaging** > **Try it out** > **Send a WhatsApp message**
2. Follow the sandbox activation instructions
3. Note the sandbox phone number and join code

### Step 3: Get Production WhatsApp Number

1. Go to **Phone Numbers** > **Buy a Number**
2. Select a number with WhatsApp capability
3. Submit WhatsApp Business Profile for approval

### Step 4: Configure Webhooks

1. Go to **Messaging** > **Settings** > **WhatsApp Sandbox/Sender Settings**
2. Set webhook URLs:
   - **When a message comes in**: `https://your-domain.com/api/v1/whatsapp/webhook/twilio`
   - **Status callback URL**: `https://your-domain.com/api/v1/whatsapp/webhook/twilio/status`

### Step 5: Get API Credentials

1. Go to **Account** > **API Keys & Tokens**
2. Copy your **Account SID** and **Auth Token**

### Step 6: Configure Environment

```env
WHATSAPP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_WHATSAPP_NUMBER=+14155238886
```

---

## Setup Guide - Meta Business API

### Prerequisites

1. Facebook Business Account
2. Meta Business Manager access
3. WhatsApp Business Account
4. Verified business (for production)

### Step 1: Create Meta Business Account

1. Go to https://business.facebook.com
2. Create a new business or use existing
3. Complete business verification

### Step 2: Create WhatsApp Business Account

1. In Business Manager, go to **Business Settings** > **Accounts** > **WhatsApp Accounts**
2. Click **Add** > **Create a WhatsApp Business Account**
3. Follow the setup wizard

### Step 3: Create Meta App

1. Go to https://developers.facebook.com
2. Click **My Apps** > **Create App**
3. Select **Business** type
4. Add **WhatsApp** product to your app

### Step 4: Configure WhatsApp

1. In your app dashboard, go to **WhatsApp** > **Getting Started**
2. Note your:
   - **Phone Number ID**
   - **WhatsApp Business Account ID**
   - **Access Token** (generate a permanent token)

### Step 5: Configure Webhooks

1. Go to **WhatsApp** > **Configuration**
2. Click **Edit** on Webhooks
3. Set callback URL: `https://your-domain.com/api/v1/whatsapp/webhook`
4. Set verify token: `your-verify-token` (choose any string)
5. Subscribe to webhook fields:
   - `messages`
   - `message_template_status_update`

### Step 6: Configure Environment

```env
WHATSAPP_PROVIDER=meta
META_PHONE_NUMBER_ID=1234567890
META_BUSINESS_ACCOUNT_ID=9876543210
META_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxx
META_VERIFY_TOKEN=your-verify-token
META_APP_SECRET=your-app-secret
```

---

## Webhook Configuration

### Webhook URLs

| Provider | Endpoint | Method | Purpose |
|----------|----------|--------|---------|
| Meta | `/api/v1/whatsapp/webhook` | GET | Webhook verification |
| Meta | `/api/v1/whatsapp/webhook` | POST | Incoming messages/status |
| Twilio | `/api/v1/whatsapp/webhook/twilio` | POST | Incoming messages |
| Twilio | `/api/v1/whatsapp/webhook/twilio/status` | POST | Delivery status |

### Webhook Security

Both providers use signature verification to ensure webhook authenticity:

**Twilio**: HMAC-SHA1 signature in `X-Twilio-Signature` header

**Meta**: HMAC-SHA256 signature in `X-Hub-Signature-256` header

The system automatically validates signatures and rejects invalid requests.

### Testing Webhooks Locally

Use ngrok to expose your local server:

```bash
# Install ngrok
npm install -g ngrok

# Start your server
npm run start:dev

# Expose port 3000
ngrok http 3000

# Use the ngrok URL in webhook configuration
# Example: https://abc123.ngrok.io/api/v1/whatsapp/webhook
```

---

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `WHATSAPP_PROVIDER` | Provider to use (`twilio` or `meta`) | `twilio` |
| `DEFAULT_TENANT_ID` | Default tenant for multi-tenant setup | `tenant-uuid` |

### Twilio Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | `ACxxxxxxxx` |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | `xxxxxxxx` |
| `TWILIO_WHATSAPP_NUMBER` | WhatsApp number | `+14155238886` |

### Meta Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `META_PHONE_NUMBER_ID` | Phone Number ID | `1234567890` |
| `META_BUSINESS_ACCOUNT_ID` | Business Account ID | `9876543210` |
| `META_ACCESS_TOKEN` | Permanent access token | `EAAxxxxxxx` |
| `META_VERIFY_TOKEN` | Webhook verify token | `my-verify-token` |
| `META_APP_SECRET` | App secret for signature | `xxxxxxxx` |

### Bot Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `WHATSAPP_BOT_ENABLED` | Enable/disable bot | `true` |
| `WHATSAPP_BOT_GREETING` | Initial greeting message | Arabic greeting |
| `WHATSAPP_HANDOFF_KEYWORDS` | Keywords to trigger human handoff | `مساعدة,موظف,بشري` |
| `WHATSAPP_MAX_RETRIES` | Max send retry attempts | `3` |

### Rate Limiting

| Variable | Description | Default |
|----------|-------------|---------|
| `WHATSAPP_DAILY_LIMIT` | Max messages per tenant/day | `1000` |
| `WHATSAPP_MONTHLY_LIMIT` | Max messages per tenant/month | `10000` |
| `WHATSAPP_CONTACT_RATE_LIMIT` | Max messages per contact/hour | `10` |

---

## Template Approval Process

WhatsApp requires pre-approval for outbound messages sent outside the 24-hour conversation window.

### Creating Templates

#### Via API

```typescript
// Create template via API
POST /api/v1/whatsapp/templates
{
  "name": "welcome_lead",
  "language": "ar",
  "category": "MARKETING",
  "components": [
    {
      "type": "HEADER",
      "format": "TEXT",
      "text": "مرحباً {{1}}"
    },
    {
      "type": "BODY",
      "text": "شكراً لاهتمامك بخدماتنا العقارية. نحن سعداء بخدمتك."
    },
    {
      "type": "FOOTER",
      "text": "صداح العقارية"
    }
  ]
}
```

#### Via Meta Business Manager

1. Go to **WhatsApp Manager** > **Message Templates**
2. Click **Create Template**
3. Fill in template details
4. Submit for approval (typically 24-48 hours)

### Template Categories

| Category | Use Case | Approval Time |
|----------|----------|---------------|
| `MARKETING` | Promotions, offers | 24-48 hours |
| `UTILITY` | Order updates, confirmations | 24-48 hours |
| `AUTHENTICATION` | OTP, verification | Faster approval |

### Template Variables

Use `{{1}}`, `{{2}}`, etc. for dynamic content:

```
مرحباً {{1}}، موعدك يوم {{2}} الساعة {{3}}
```

### Syncing Templates

```bash
# Sync templates from WhatsApp to database
POST /api/v1/whatsapp/templates/sync
```

---

## API Reference

### Webhook Endpoints

#### Meta Webhook Verification
```
GET /api/v1/whatsapp/webhook
Query: hub.mode, hub.verify_token, hub.challenge
```

#### Meta Webhook (Messages/Status)
```
POST /api/v1/whatsapp/webhook
Headers: X-Hub-Signature-256
Body: Meta webhook payload
```

#### Twilio Webhook (Messages)
```
POST /api/v1/whatsapp/webhook/twilio
Headers: X-Twilio-Signature
Body: Twilio form data
```

#### Twilio Status Callback
```
POST /api/v1/whatsapp/webhook/twilio/status
Headers: X-Twilio-Signature
Body: Twilio status form data
```

### Template Management

#### List Templates
```
GET /api/v1/whatsapp/templates
Query: status, category, search, limit, offset
```

#### Get Template
```
GET /api/v1/whatsapp/templates/:id
```

#### Create Template
```
POST /api/v1/whatsapp/templates
Body: { name, language, category, components }
```

#### Delete Template
```
DELETE /api/v1/whatsapp/templates/:id
```

#### Sync Templates
```
POST /api/v1/whatsapp/templates/sync
```

### Media Handling

#### Upload Media
```
POST /api/v1/whatsapp/media/upload
Body: multipart/form-data with file
```

#### Get Media URL
```
GET /api/v1/whatsapp/media/:mediaId
```

### Status & Quotas

#### Get Delivery Status
```
GET /api/v1/whatsapp/status/message/:messageId
```

#### Get Quota Usage
```
GET /api/v1/whatsapp/quotas
```

---

## Next Steps

- [WhatsApp Bot Flow Documentation](./whatsapp-bot-flow.md)
- [Troubleshooting Guide](./whatsapp-troubleshooting.md)
