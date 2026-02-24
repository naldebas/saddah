# WhatsApp Troubleshooting Guide

This guide covers common issues and their solutions for the SADDAH WhatsApp integration.

## Table of Contents

1. [Webhook Issues](#webhook-issues)
2. [Message Delivery Issues](#message-delivery-issues)
3. [Bot Response Issues](#bot-response-issues)
4. [Authentication Issues](#authentication-issues)
5. [Rate Limiting Issues](#rate-limiting-issues)
6. [Template Issues](#template-issues)
7. [Media Issues](#media-issues)
8. [Local Development](#local-development)
9. [Logging and Debugging](#logging-and-debugging)

---

## Webhook Issues

### Webhook Not Receiving Messages

**Symptoms:**
- No incoming messages in logs
- Webhook URL not being called

**Solutions:**

1. **Verify webhook URL is accessible**
   ```bash
   curl -X POST https://your-domain.com/api/v1/whatsapp/webhook \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   ```

2. **Check HTTPS certificate**
   - WhatsApp requires valid SSL certificates
   - Use Let's Encrypt for free certificates

3. **Verify webhook registration**
   - **Twilio**: Check Messaging > Settings > WhatsApp Sandbox
   - **Meta**: Check App Dashboard > WhatsApp > Configuration

4. **Check firewall rules**
   - Allow incoming connections on port 443
   - Whitelist Meta/Twilio IP ranges

### Webhook Signature Verification Failed (403)

**Symptoms:**
- 403 Forbidden response
- "Invalid signature" in logs

**Solutions:**

1. **Twilio: Verify auth token**
   ```bash
   # Check TWILIO_AUTH_TOKEN in .env matches Twilio console
   ```

2. **Meta: Verify app secret**
   ```bash
   # Check META_APP_SECRET in .env matches App Dashboard
   ```

3. **Check webhook URL matches exactly**
   - Signature is calculated using the full URL
   - Include trailing slashes if configured

4. **Debug signature calculation**
   ```typescript
   // Enable debug logging
   LOG_LEVEL=debug npm run start
   ```

### Meta Webhook Verification Failing

**Symptoms:**
- Can't save webhook URL in Meta dashboard
- "Verification failed" error

**Solutions:**

1. **Check verify token matches**
   ```bash
   # META_VERIFY_TOKEN in .env must match dashboard setting
   ```

2. **Verify endpoint returns challenge**
   ```bash
   curl "https://your-domain.com/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=12345"
   # Should return: 12345
   ```

3. **Check endpoint is accessible**
   - No authentication on GET /webhook
   - Returns 200 status

---

## Message Delivery Issues

### Messages Not Being Sent

**Symptoms:**
- Messages queued but not delivered
- No external ID returned

**Solutions:**

1. **Check queue is processing**
   ```bash
   # Check Bull queue status
   curl http://localhost:3000/api/v1/whatsapp/status/queue
   ```

2. **Verify Redis is running**
   ```bash
   redis-cli ping
   # Should return: PONG
   ```

3. **Check adapter configuration**
   ```typescript
   // Verify isConfigured() returns true
   GET /api/v1/whatsapp/status
   ```

4. **Review failed jobs**
   ```bash
   # Get failed jobs
   GET /api/v1/whatsapp/status/failed-jobs
   ```

### Messages Stuck in "Sending" Status

**Symptoms:**
- Messages stay in "sending" status
- No delivery confirmation

**Solutions:**

1. **Check status webhook is configured**
   - Twilio: Status callback URL must be set
   - Meta: Status webhook field must be subscribed

2. **Manually check message status**
   ```bash
   # Twilio
   curl -X GET "https://api.twilio.com/2010-04-01/Accounts/{SID}/Messages/{MessageSid}.json" \
     -u "{AccountSid}:{AuthToken}"
   ```

3. **Process stuck messages**
   ```bash
   # Retry failed jobs
   POST /api/v1/whatsapp/status/retry-failed
   ```

### "Outside 24-Hour Window" Error

**Symptoms:**
- Error code 131047 (Meta)
- "Cannot send message outside session" (Twilio)

**Solutions:**

1. **Use template messages**
   - Outside 24-hour window, only templates allowed
   - Ensure templates are approved

2. **Check last message time**
   ```sql
   SELECT * FROM messages
   WHERE conversation_id = 'xxx'
   ORDER BY created_at DESC LIMIT 1;
   ```

3. **Initiate with template**
   ```typescript
   await senderService.sendTemplateMessage(
     to,
     'reengagement_template',
     { language: 'ar' }
   );
   ```

---

## Bot Response Issues

### Bot Not Responding

**Symptoms:**
- Messages received but no bot response
- Bot status shows disabled

**Solutions:**

1. **Check bot is enabled**
   ```bash
   # Environment variable
   WHATSAPP_BOT_ENABLED=true
   ```

2. **Verify conversation is in bot mode**
   ```sql
   SELECT status FROM conversations WHERE id = 'xxx';
   -- Should be 'bot', not 'pending' or 'active'
   ```

3. **Check LLM service availability**
   ```bash
   GET /api/v1/ai/status
   # Should show available: true
   ```

4. **Review bot logs**
   ```bash
   grep "WhatsAppBotService" logs/app.log
   ```

### Bot Giving Incorrect Responses

**Symptoms:**
- Bot not understanding Arabic
- Wrong state transitions
- Inappropriate responses

**Solutions:**

1. **Check OpenAI API key**
   ```bash
   OPENAI_API_KEY=sk-xxx
   # Verify key is valid and has credits
   ```

2. **Review system prompt**
   ```typescript
   // Check src/modules/ai/prompts/system-prompt.ts
   // Ensure Saudi dialect instructions are included
   ```

3. **Test state machine**
   ```bash
   npm run test -- --testPathPattern="state-machine"
   ```

4. **Enable conversation logging**
   ```bash
   DEBUG_CONVERSATIONS=true
   ```

### Bot Falling Back to Generic Responses

**Symptoms:**
- "كيف يمكنني مساعدتك؟" for all responses
- No personalization

**Solutions:**

1. **Check LLM errors**
   ```bash
   grep "LLM error" logs/app.log
   ```

2. **Verify OpenAI quota**
   - Check OpenAI dashboard for usage limits
   - Verify billing is active

3. **Test LLM directly**
   ```bash
   POST /api/v1/ai/test
   {
     "message": "أبي فيلا بالرياض"
   }
   ```

---

## Authentication Issues

### Invalid Credentials Error

**Symptoms:**
- 401 Unauthorized from WhatsApp API
- "Invalid credentials" in logs

**Solutions:**

1. **Twilio credentials**
   ```bash
   # Verify in Twilio Console > Account > API Keys
   TWILIO_ACCOUNT_SID=ACxxxxxxxx
   TWILIO_AUTH_TOKEN=xxxxxxxx
   ```

2. **Meta credentials**
   ```bash
   # Verify in Meta Developer Portal
   META_ACCESS_TOKEN=EAAxxxxxxxx
   # Token must not be expired
   ```

3. **Regenerate tokens**
   - Twilio: Account > API Keys > Generate new
   - Meta: App Settings > Basic > Reset Secret

### Token Expired (Meta)

**Symptoms:**
- "OAuthException" errors
- Messages suddenly stop sending

**Solutions:**

1. **Generate permanent token**
   - Go to Meta Business Suite
   - Generate System User token
   - Use "never expires" option

2. **Set up token refresh**
   ```typescript
   // Implement token refresh in whatsapp-config.service.ts
   ```

---

## Rate Limiting Issues

### Quota Exceeded Error

**Symptoms:**
- QUOTA_EXCEEDED error code
- Messages rejected

**Solutions:**

1. **Check current usage**
   ```bash
   GET /api/v1/whatsapp/quotas
   ```

2. **Increase limits**
   ```bash
   # Environment variables
   WHATSAPP_DAILY_LIMIT=5000
   WHATSAPP_MONTHLY_LIMIT=50000
   ```

3. **Reset quota (admin)**
   ```sql
   UPDATE whatsapp_quota_usage
   SET messages_sent = 0
   WHERE tenant_id = 'xxx' AND date = CURRENT_DATE;
   ```

### Contact Rate Limited

**Symptoms:**
- RATE_LIMIT_EXCEEDED error
- "Retry after X seconds" message

**Solutions:**

1. **Wait for window to expire**
   - Default: 10 messages per contact per hour
   - Window resets after 1 hour

2. **Adjust rate limits**
   ```bash
   WHATSAPP_CONTACT_RATE_LIMIT=20
   WHATSAPP_CONTACT_RATE_WINDOW_MS=3600000
   ```

---

## Template Issues

### Template Not Found

**Symptoms:**
- "Template not found" error
- Template sending fails

**Solutions:**

1. **Sync templates from WhatsApp**
   ```bash
   POST /api/v1/whatsapp/templates/sync
   ```

2. **Check template name**
   - Template names are case-sensitive
   - Must use exact name from WhatsApp

3. **Verify template is approved**
   ```sql
   SELECT status FROM whatsapp_templates WHERE name = 'xxx';
   -- Should be 'APPROVED'
   ```

### Template Rejected

**Symptoms:**
- Template status: REJECTED
- Can't send template messages

**Solutions:**

1. **Check rejection reason**
   ```sql
   SELECT rejection_reason FROM whatsapp_templates WHERE name = 'xxx';
   ```

2. **Common rejection reasons:**
   - Contains prohibited content
   - Missing variable placeholders
   - Incorrect category selection
   - URL without example

3. **Resubmit with corrections**
   - Delete rejected template
   - Create new template with fixes
   - Use different name (can't reuse rejected names)

---

## Media Issues

### Media Upload Failed

**Symptoms:**
- "Failed to upload media" error
- Media URL not returned

**Solutions:**

1. **Check file size**
   - Images: Max 5MB
   - Videos: Max 16MB
   - Documents: Max 100MB

2. **Check file type**
   - Supported: jpeg, png, pdf, mp4, ogg
   - Check MIME type is correct

3. **Verify storage configuration**
   ```bash
   # Check S3/storage settings
   AWS_S3_BUCKET=xxx
   AWS_REGION=xxx
   ```

### Media Not Displaying

**Symptoms:**
- Media sent but shows as broken
- "Media expired" message

**Solutions:**

1. **Check media URL accessibility**
   ```bash
   curl -I "https://your-cdn.com/media/image.jpg"
   # Should return 200
   ```

2. **Use permanent URLs**
   - Twilio media URLs expire
   - Download and re-host on your CDN

3. **Check CORS settings**
   ```
   Access-Control-Allow-Origin: *
   ```

---

## Local Development

### Testing with ngrok

```bash
# Install ngrok
npm install -g ngrok

# Start your NestJS server
npm run start:dev

# In another terminal, expose port 3000
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Use this as your webhook URL
```

### Webhook Testing Without Provider

```bash
# Simulate Twilio webhook
curl -X POST http://localhost:3000/api/v1/whatsapp/webhook/twilio \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "MessageSid=SM12345&From=whatsapp:+966501234567&Body=مرحبا"

# Simulate Meta webhook
curl -X POST http://localhost:3000/api/v1/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=xxx" \
  -d '{"object":"whatsapp_business_account","entry":[...]}'
```

### Mock Adapter for Testing

```typescript
// Use mock adapter in development
WHATSAPP_PROVIDER=mock
```

---

## Logging and Debugging

### Enable Debug Logging

```bash
# Environment variable
LOG_LEVEL=debug

# Or specific namespaces
DEBUG=whatsapp:*
```

### View Logs

```bash
# Application logs
tail -f logs/app.log

# Filter by service
grep "WhatsAppBotService" logs/app.log
grep "WhatsAppSenderService" logs/app.log
```

### Database Debugging

```sql
-- Recent conversations
SELECT * FROM conversations
WHERE channel = 'whatsapp'
ORDER BY created_at DESC LIMIT 10;

-- Recent messages
SELECT * FROM messages
WHERE conversation_id = 'xxx'
ORDER BY created_at DESC;

-- Failed messages
SELECT * FROM messages
WHERE status = 'failed'
ORDER BY created_at DESC;
```

### Queue Debugging

```bash
# Bull Board UI (if enabled)
http://localhost:3000/admin/queues

# Redis CLI
redis-cli
> KEYS bull:whatsapp-messages:*
> LRANGE bull:whatsapp-messages:failed 0 -1
```

---

## Getting Help

If you're still experiencing issues:

1. **Check application logs** for detailed error messages
2. **Enable debug mode** for verbose logging
3. **Review this guide** for common solutions
4. **Contact support** with:
   - Error message
   - Request/response logs
   - Steps to reproduce
   - Environment details

## Related Documentation

- [WhatsApp Integration Guide](./whatsapp-integration.md)
- [Bot Flow Documentation](./whatsapp-bot-flow.md)
