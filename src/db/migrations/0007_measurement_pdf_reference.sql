ALTER TABLE "service_orders" ADD COLUMN IF NOT EXISTS "budget_reference" varchar(64);
ALTER TABLE "service_orders" ADD COLUMN IF NOT EXISTS "source_pdf_url" text;
