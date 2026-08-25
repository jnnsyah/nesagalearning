CREATE TABLE "master_angkatan" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "master_angkatan_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"year" integer NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "master_angkatan_year_unique" UNIQUE("year")
);
--> statement-breakpoint
CREATE TABLE "master_rombel" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "master_rombel_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"level_order" integer DEFAULT 1 NOT NULL,
	"next_rombel_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "master_rombel_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "curriculum_track" ALTER COLUMN "tingkat_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "angkatan" integer;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "rombel_label" text;--> statement-breakpoint
ALTER TABLE "kelas_instance" ADD COLUMN "target_angkatan" integer;--> statement-breakpoint
ALTER TABLE "point_log" ADD COLUMN "periode_id" bigint;--> statement-breakpoint
ALTER TABLE "point_log" ADD CONSTRAINT "point_log_periode_id_tahun_ajaran_id_fk" FOREIGN KEY ("periode_id") REFERENCES "public"."tahun_ajaran"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_user_angkatan" ON "user" USING btree ("angkatan");--> statement-breakpoint
CREATE INDEX "idx_kelas_instance_target_angkatan" ON "kelas_instance" USING btree ("target_angkatan");--> statement-breakpoint
CREATE INDEX "idx_point_log_user_periode" ON "point_log" USING btree ("user_id","periode_id");