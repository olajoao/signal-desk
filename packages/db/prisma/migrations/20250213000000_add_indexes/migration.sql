-- DropIndex (replaced by composite)
DROP INDEX IF EXISTS "rules_org_id_event_type_idx";
DROP INDEX IF EXISTS "notifications_org_id_status_idx";
DROP INDEX IF EXISTS "notifications_org_id_channel_idx";

-- CreateIndex
CREATE INDEX "rules_org_id_event_type_enabled_idx" ON "rules"("org_id", "event_type", "enabled");

-- CreateIndex
CREATE INDEX "notifications_org_id_status_channel_idx" ON "notifications"("org_id", "status", "channel");

-- CreateIndex
CREATE INDEX "notifications_org_id_created_at_idx" ON "notifications"("org_id", "created_at");

-- CreateIndex
CREATE INDEX "refresh_tokens_org_id_idx" ON "refresh_tokens"("org_id");

-- CreateIndex
CREATE INDEX "system_alerts_org_id_type_idx" ON "system_alerts"("org_id", "type");
