CREATE TABLE "pending_registration" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "pending_registration_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"token" text NOT NULL,
	"full_name" text NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"code" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"resend_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pending_registration_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE INDEX "idx_pending_registration_token" ON "pending_registration" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_pending_registration_email" ON "pending_registration" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_pending_registration_username" ON "pending_registration" USING btree ("username");