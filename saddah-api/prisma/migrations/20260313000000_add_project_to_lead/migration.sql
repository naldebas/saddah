-- AlterTable
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "project_id" TEXT;

-- AddForeignKey (only if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'leads_project_id_fkey'
  ) THEN
    ALTER TABLE "leads" ADD CONSTRAINT "leads_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "leads_tenant_id_project_id_idx" ON "leads"("tenant_id", "project_id");
