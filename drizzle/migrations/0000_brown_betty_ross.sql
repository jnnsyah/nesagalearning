CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ua_is_mobile" boolean DEFAULT false NOT NULL,
	"remember_me" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"username" text NOT NULL,
	"email" text,
	"password_hash" text NOT NULL,
	"full_name" text NOT NULL,
	"role" text NOT NULL,
	"avatar_url" text,
	"google_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_username_unique" UNIQUE("username"),
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_google_id_unique" UNIQUE("google_id")
);
--> statement-breakpoint
CREATE TABLE "keanggotaan" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "keanggotaan_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" bigint NOT NULL,
	"kelas_instance_id" bigint NOT NULL,
	"status" text DEFAULT 'aktif' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "keanggotaan_user_kelas_unique" UNIQUE("user_id","kelas_instance_id")
);
--> statement-breakpoint
CREATE TABLE "kelas_instance" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "kelas_instance_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"tahun_ajaran_id" bigint NOT NULL,
	"tingkat_id" bigint NOT NULL,
	"curriculum_track_id" bigint NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kelas_instance_tahun_tingkat_unique" UNIQUE("tahun_ajaran_id","tingkat_id")
);
--> statement-breakpoint
CREATE TABLE "mentor_assignment" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mentor_assignment_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" bigint NOT NULL,
	"kelas_instance_id" bigint NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mentor_assignment_user_kelas_unique" UNIQUE("user_id","kelas_instance_id")
);
--> statement-breakpoint
CREATE TABLE "tahun_ajaran" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tahun_ajaran_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tahun_ajaran_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "tingkat" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tingkat_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"level_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tingkat_name_unique" UNIQUE("name"),
	CONSTRAINT "tingkat_level_order_unique" UNIQUE("level_order")
);
--> statement-breakpoint
CREATE TABLE "curriculum_track" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "curriculum_track_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"tingkat_id" bigint NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "materi" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "materi_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"sub_phase_id" bigint NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "materi_sort_unique" UNIQUE("sub_phase_id","sort_order")
);
--> statement-breakpoint
CREATE TABLE "phase" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "phase_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"curriculum_track_id" bigint NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "phase_track_sort_unique" UNIQUE("curriculum_track_id","sort_order")
);
--> statement-breakpoint
CREATE TABLE "quiz" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "quiz_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"sub_phase_id" bigint NOT NULL,
	"title" text NOT NULL,
	"passing_score" integer DEFAULT 60 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_question" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "quiz_question_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"quiz_id" bigint NOT NULL,
	"question_text" text NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quiz_question_sort_unique" UNIQUE("quiz_id","sort_order")
);
--> statement-breakpoint
CREATE TABLE "sub_phase" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sub_phase_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"phase_id" bigint NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sub_phase_sort_unique" UNIQUE("phase_id","sort_order")
);
--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "attendance_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"pertemuan_id" bigint NOT NULL,
	"user_id" bigint NOT NULL,
	"method" text NOT NULL,
	"status" text NOT NULL,
	"manual_reason" text,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attendance_pertemuan_user_unique" UNIQUE("pertemuan_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "attendance_token" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "attendance_token_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"pertemuan_id" bigint NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attendance_token_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "pertemuan" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "pertemuan_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"kelas_instance_id" bigint NOT NULL,
	"sub_phase_id" bigint NOT NULL,
	"title" text NOT NULL,
	"activity_type" text NOT NULL,
	"session_date" date NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"location" text,
	"material_url" text,
	"is_weekend" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submission" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "submission_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"task_id" bigint NOT NULL,
	"user_id" bigint NOT NULL,
	"link" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"feedback" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" bigint,
	CONSTRAINT "submission_task_user_unique" UNIQUE("task_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "task" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "task_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"pertemuan_id" bigint NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"task_size" text DEFAULT 'sedang' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "badge" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "badge_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" bigint NOT NULL,
	"badge_type_id" bigint NOT NULL,
	"earned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "badge_user_type_unique" UNIQUE("user_id","badge_type_id")
);
--> statement-breakpoint
CREATE TABLE "badge_type" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "badge_type_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"description" text,
	"icon_url" text,
	"criteria" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "badge_type_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "point_config" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "point_config_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"config_key" text NOT NULL,
	"config_value" integer NOT NULL,
	"description" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "point_config_config_key_unique" UNIQUE("config_key")
);
--> statement-breakpoint
CREATE TABLE "point_log" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "point_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" bigint NOT NULL,
	"kelas_instance_id" bigint NOT NULL,
	"source" text NOT NULL,
	"amount" integer NOT NULL,
	"reference_id" bigint,
	"reference_type" text,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_attempt" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "quiz_attempt_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"quiz_id" bigint NOT NULL,
	"user_id" bigint NOT NULL,
	"score" integer NOT NULL,
	"answers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "streak_counter" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "streak_counter_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" bigint NOT NULL,
	"kelas_instance_id" bigint NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"max_streak" integer DEFAULT 0 NOT NULL,
	"last_attended_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "streak_counter_user_kelas_unique" UNIQUE("user_id","kelas_instance_id")
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "notification_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" bigint NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"reference_id" bigint,
	"reference_type" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"actor_id" bigint,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" bigint,
	"old_values" jsonb,
	"new_values" jsonb,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "avatar" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "avatar_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"image_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "room_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "room_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keanggotaan" ADD CONSTRAINT "keanggotaan_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keanggotaan" ADD CONSTRAINT "keanggotaan_kelas_instance_id_kelas_instance_id_fk" FOREIGN KEY ("kelas_instance_id") REFERENCES "public"."kelas_instance"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kelas_instance" ADD CONSTRAINT "kelas_instance_tahun_ajaran_id_tahun_ajaran_id_fk" FOREIGN KEY ("tahun_ajaran_id") REFERENCES "public"."tahun_ajaran"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kelas_instance" ADD CONSTRAINT "kelas_instance_tingkat_id_tingkat_id_fk" FOREIGN KEY ("tingkat_id") REFERENCES "public"."tingkat"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kelas_instance" ADD CONSTRAINT "kelas_instance_curriculum_track_id_curriculum_track_id_fk" FOREIGN KEY ("curriculum_track_id") REFERENCES "public"."curriculum_track"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_assignment" ADD CONSTRAINT "mentor_assignment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_assignment" ADD CONSTRAINT "mentor_assignment_kelas_instance_id_kelas_instance_id_fk" FOREIGN KEY ("kelas_instance_id") REFERENCES "public"."kelas_instance"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_track" ADD CONSTRAINT "curriculum_track_tingkat_id_tingkat_id_fk" FOREIGN KEY ("tingkat_id") REFERENCES "public"."tingkat"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materi" ADD CONSTRAINT "materi_sub_phase_id_sub_phase_id_fk" FOREIGN KEY ("sub_phase_id") REFERENCES "public"."sub_phase"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phase" ADD CONSTRAINT "phase_curriculum_track_id_curriculum_track_id_fk" FOREIGN KEY ("curriculum_track_id") REFERENCES "public"."curriculum_track"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz" ADD CONSTRAINT "quiz_sub_phase_id_sub_phase_id_fk" FOREIGN KEY ("sub_phase_id") REFERENCES "public"."sub_phase"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_question" ADD CONSTRAINT "quiz_question_quiz_id_quiz_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quiz"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sub_phase" ADD CONSTRAINT "sub_phase_phase_id_phase_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."phase"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_pertemuan_id_pertemuan_id_fk" FOREIGN KEY ("pertemuan_id") REFERENCES "public"."pertemuan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_token" ADD CONSTRAINT "attendance_token_pertemuan_id_pertemuan_id_fk" FOREIGN KEY ("pertemuan_id") REFERENCES "public"."pertemuan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pertemuan" ADD CONSTRAINT "pertemuan_kelas_instance_id_kelas_instance_id_fk" FOREIGN KEY ("kelas_instance_id") REFERENCES "public"."kelas_instance"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pertemuan" ADD CONSTRAINT "pertemuan_sub_phase_id_sub_phase_id_fk" FOREIGN KEY ("sub_phase_id") REFERENCES "public"."sub_phase"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission" ADD CONSTRAINT "submission_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission" ADD CONSTRAINT "submission_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission" ADD CONSTRAINT "submission_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_pertemuan_id_pertemuan_id_fk" FOREIGN KEY ("pertemuan_id") REFERENCES "public"."pertemuan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "badge" ADD CONSTRAINT "badge_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "badge" ADD CONSTRAINT "badge_badge_type_id_badge_type_id_fk" FOREIGN KEY ("badge_type_id") REFERENCES "public"."badge_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_log" ADD CONSTRAINT "point_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_log" ADD CONSTRAINT "point_log_kelas_instance_id_kelas_instance_id_fk" FOREIGN KEY ("kelas_instance_id") REFERENCES "public"."kelas_instance"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempt" ADD CONSTRAINT "quiz_attempt_quiz_id_quiz_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quiz"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempt" ADD CONSTRAINT "quiz_attempt_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streak_counter" ADD CONSTRAINT "streak_counter_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streak_counter" ADD CONSTRAINT "streak_counter_kelas_instance_id_kelas_instance_id_fk" FOREIGN KEY ("kelas_instance_id") REFERENCES "public"."kelas_instance"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_session_user" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_role" ON "user" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_keanggotaan_user" ON "keanggotaan" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_keanggotaan_kelas" ON "keanggotaan" USING btree ("kelas_instance_id");--> statement-breakpoint
CREATE INDEX "idx_keanggotaan_user_status" ON "keanggotaan" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_kelas_instance_tahun" ON "kelas_instance" USING btree ("tahun_ajaran_id");--> statement-breakpoint
CREATE INDEX "idx_kelas_instance_tingkat" ON "kelas_instance" USING btree ("tingkat_id");--> statement-breakpoint
CREATE INDEX "idx_kelas_instance_track" ON "kelas_instance" USING btree ("curriculum_track_id");--> statement-breakpoint
CREATE INDEX "idx_mentor_assignment_user" ON "mentor_assignment" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_mentor_assignment_kelas" ON "mentor_assignment" USING btree ("kelas_instance_id");--> statement-breakpoint
CREATE INDEX "idx_curriculum_track_tingkat" ON "curriculum_track" USING btree ("tingkat_id");--> statement-breakpoint
CREATE INDEX "idx_materi_sub_phase" ON "materi" USING btree ("sub_phase_id");--> statement-breakpoint
CREATE INDEX "idx_phase_track" ON "phase" USING btree ("curriculum_track_id");--> statement-breakpoint
CREATE INDEX "idx_quiz_sub_phase" ON "quiz" USING btree ("sub_phase_id");--> statement-breakpoint
CREATE INDEX "idx_quiz_question_quiz" ON "quiz_question" USING btree ("quiz_id");--> statement-breakpoint
CREATE INDEX "idx_sub_phase_phase" ON "sub_phase" USING btree ("phase_id");--> statement-breakpoint
CREATE INDEX "idx_attendance_pertemuan" ON "attendance" USING btree ("pertemuan_id");--> statement-breakpoint
CREATE INDEX "idx_attendance_user" ON "attendance" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_attendance_user_recorded" ON "attendance" USING btree ("user_id","recorded_at");--> statement-breakpoint
CREATE INDEX "idx_attendance_token_pertemuan" ON "attendance_token" USING btree ("pertemuan_id");--> statement-breakpoint
CREATE INDEX "idx_pertemuan_kelas" ON "pertemuan" USING btree ("kelas_instance_id");--> statement-breakpoint
CREATE INDEX "idx_pertemuan_sub_phase" ON "pertemuan" USING btree ("sub_phase_id");--> statement-breakpoint
CREATE INDEX "idx_pertemuan_kelas_date" ON "pertemuan" USING btree ("kelas_instance_id","session_date");--> statement-breakpoint
CREATE INDEX "idx_submission_task" ON "submission" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_submission_user" ON "submission" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_submission_status" ON "submission" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_task_pertemuan" ON "task" USING btree ("pertemuan_id");--> statement-breakpoint
CREATE INDEX "idx_badge_user" ON "badge" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_badge_type" ON "badge" USING btree ("badge_type_id");--> statement-breakpoint
CREATE INDEX "idx_point_log_user_kelas" ON "point_log" USING btree ("user_id","kelas_instance_id");--> statement-breakpoint
CREATE INDEX "idx_point_log_kelas" ON "point_log" USING btree ("kelas_instance_id");--> statement-breakpoint
CREATE INDEX "idx_quiz_attempt_quiz" ON "quiz_attempt" USING btree ("quiz_id");--> statement-breakpoint
CREATE INDEX "idx_quiz_attempt_user" ON "quiz_attempt" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_streak_user_kelas" ON "streak_counter" USING btree ("user_id","kelas_instance_id");--> statement-breakpoint
CREATE INDEX "idx_notification_user" ON "notification" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_audit_log_actor" ON "audit_log" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "idx_audit_log_entity" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_audit_log_action" ON "audit_log" USING btree ("action");