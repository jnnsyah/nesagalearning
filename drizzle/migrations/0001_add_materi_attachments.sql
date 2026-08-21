ALTER TABLE "materi" ADD COLUMN IF NOT EXISTS "attachments" jsonb DEFAULT '[]'::jsonb;
--> statement-breakpoint
UPDATE "materi" SET "attachments" = '[]'::jsonb WHERE "attachments" IS NULL;
