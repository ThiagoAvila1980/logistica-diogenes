CREATE TABLE IF NOT EXISTS "notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" varchar(64) NOT NULL,
  "title" varchar(255) NOT NULL,
  "body" text NOT NULL,
  "href" text,
  "os_id" uuid REFERENCES "service_orders"("id") ON DELETE SET NULL,
  "read_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "idx_notifications_user_created" ON "notifications" ("user_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_notifications_user_unread" ON "notifications" ("user_id") WHERE "read_at" IS NULL;
