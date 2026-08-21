CREATE TABLE "advisor_note" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "advisor_note_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"student_id" bigint NOT NULL,
	"advisor_id" bigint NOT NULL,
	"note" text NOT NULL,
	"category" text DEFAULT 'intervensi' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "materi_completion" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "materi_completion_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"materi_id" bigint NOT NULL,
	"user_id" bigint NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "materi_completion_user_materi_unique" UNIQUE("user_id","materi_id")
);
--> statement-breakpoint
CREATE TABLE "activity_type" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "activity_type_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "activity_type_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "email_outbox" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "email_outbox_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"sender_email" text NOT NULL,
	"recipient_email" text NOT NULL,
	"subject" text NOT NULL,
	"body_html" text NOT NULL,
	"body_text" text,
	"status" text DEFAULT 'sent' NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_verification_code" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "email_verification_code_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" bigint NOT NULL,
	"email" text NOT NULL,
	"code" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_token" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "password_reset_token_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" bigint NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_token_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "system_email_config" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "system_email_config_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"label" text NOT NULL,
	"sender_name" text NOT NULL,
	"sender_email" text NOT NULL,
	"provider" text DEFAULT 'gmail' NOT NULL,
	"smtp_host" text,
	"smtp_port" text,
	"smtp_user" text,
	"smtp_pass_encrypted" text,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "nisn" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "is_email_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "materi" ADD COLUMN "attachments" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "badge_type" ADD COLUMN "trigger_type" text DEFAULT 'manual_award' NOT NULL;--> statement-breakpoint
ALTER TABLE "badge_type" ADD COLUMN "trigger_threshold" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "advisor_note" ADD CONSTRAINT "advisor_note_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advisor_note" ADD CONSTRAINT "advisor_note_advisor_id_user_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materi_completion" ADD CONSTRAINT "materi_completion_materi_id_materi_id_fk" FOREIGN KEY ("materi_id") REFERENCES "public"."materi"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materi_completion" ADD CONSTRAINT "materi_completion_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_verification_code" ADD CONSTRAINT "email_verification_code_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_token" ADD CONSTRAINT "password_reset_token_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_advisor_note_student" ON "advisor_note" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_advisor_note_advisor" ON "advisor_note" USING btree ("advisor_id");--> statement-breakpoint
CREATE INDEX "idx_materi_completion_user" ON "materi_completion" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_materi_completion_materi" ON "materi_completion" USING btree ("materi_id");--> statement-breakpoint
CREATE INDEX "idx_email_outbox_recipient" ON "email_outbox" USING btree ("recipient_email");--> statement-breakpoint
CREATE INDEX "idx_email_outbox_status" ON "email_outbox" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_email_verification_code_user" ON "email_verification_code" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_password_reset_token_user" ON "password_reset_token" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_nisn" ON "user" USING btree ("nisn");--> statement-breakpoint
ALTER TABLE "quiz_question" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_nisn_unique" UNIQUE("nisn");