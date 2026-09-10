ALTER TABLE "materi" ADD COLUMN IF NOT EXISTS "video_recommendations" jsonb DEFAULT '[]'::jsonb;
