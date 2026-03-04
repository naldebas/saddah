-- CreateTable
CREATE TABLE "botpress_configs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "bot_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "credentials" TEXT NOT NULL,
    "webhook_url" TEXT NOT NULL,
    "callback_url" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "auto_create_lead" BOOLEAN NOT NULL DEFAULT true,
    "auto_convert_deal" BOOLEAN NOT NULL DEFAULT true,
    "qualification_threshold" INTEGER NOT NULL DEFAULT 60,
    "default_pipeline_id" TEXT,
    "last_tested_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "botpress_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "botpress_conversations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "botpress_conv_id" TEXT NOT NULL,
    "botpress_state" TEXT,
    "qualification_data" JSONB NOT NULL DEFAULT '{}',
    "qualification_score" INTEGER NOT NULL DEFAULT 0,
    "last_synced_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "botpress_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "botpress_configs_tenant_id_key" ON "botpress_configs"("tenant_id");

-- CreateIndex
CREATE INDEX "botpress_configs_tenant_id_idx" ON "botpress_configs"("tenant_id");

-- CreateIndex
CREATE INDEX "botpress_conversations_tenant_id_idx" ON "botpress_conversations"("tenant_id");

-- CreateIndex
CREATE INDEX "botpress_conversations_botpress_conv_id_idx" ON "botpress_conversations"("botpress_conv_id");

-- CreateIndex
CREATE UNIQUE INDEX "botpress_conversations_tenant_id_conversation_id_key" ON "botpress_conversations"("tenant_id", "conversation_id");
