-- =============================================
-- 17solutions V2 — Datenbank Setup
-- Dieses Script im Neon SQL Editor ausführen
-- =============================================

-- 1. TABELLEN

CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"name" varchar(255),
	"role" varchar(20) DEFAULT 'user' NOT NULL,
	"language" varchar(5) DEFAULT 'de' NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"invite_token" varchar(255),
	"invite_expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_login_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);

CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"brand_name" varchar(255) NOT NULL,
	"current_module" varchar(50) DEFAULT 'verstehen_01' NOT NULL,
	"language" varchar(5) DEFAULT 'de' NOT NULL,
	"mode" varchar(20) DEFAULT 'creative' NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);

CREATE TABLE "context_store" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"module_id" varchar(50) NOT NULL,
	"output_data" jsonb NOT NULL,
	"citations" jsonb,
	"confidence_score" numeric(3, 2),
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"role" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"module_id" varchar(50),
	"tokens_input" integer,
	"tokens_output" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "usage_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid,
	"module_id" varchar(50),
	"model" varchar(50) NOT NULL,
	"tokens_input" integer DEFAULT 0 NOT NULL,
	"tokens_output" integer DEFAULT 0 NOT NULL,
	"tokens_total" integer DEFAULT 0 NOT NULL,
	"cost_usd" numeric(10, 6) DEFAULT '0' NOT NULL,
	"cached" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- 2. FOREIGN KEYS

ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "context_store" ADD CONSTRAINT "context_store_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "messages" ADD CONSTRAINT "messages_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;

-- 3. ADMIN USER (f100r@me.com / changeme123)

INSERT INTO "users" ("email", "password_hash", "name", "role", "language", "status")
VALUES ('f100r@me.com', '$2b$12$K5Jm33l5/iEP6ZMqcU6N6uLqmQ1qhJlEpncQ6u65BOTsLsAS7BkxS', 'Roland Rudolf', 'admin', 'de', 'active');
