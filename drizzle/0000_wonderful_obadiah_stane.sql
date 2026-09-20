CREATE TABLE "admin_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" varchar(64),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"full_name" varchar(150) NOT NULL,
	"role" varchar(50) DEFAULT 'admin' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(60) NOT NULL,
	"entity_id" varchar(100),
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip_address" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"description" text,
	"logo_url" text,
	"is_featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "brands_name_unique" UNIQUE("name"),
	CONSTRAINT "brands_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "catalog_import_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"import_id" uuid NOT NULL,
	"source_record_id" varchar(150) NOT NULL,
	"action" varchar(30) NOT NULL,
	"diff_summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "catalog_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"import_number" integer NOT NULL,
	"filename" varchar(255),
	"is_full_snapshot" boolean DEFAULT false NOT NULL,
	"status" varchar(40) DEFAULT 'dry_run_ready' NOT NULL,
	"total_records_received" integer DEFAULT 0 NOT NULL,
	"would_create_count" integer DEFAULT 0 NOT NULL,
	"would_update_count" integer DEFAULT 0 NOT NULL,
	"would_deactivate_count" integer DEFAULT 0 NOT NULL,
	"unchanged_count" integer DEFAULT 0 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"safety_threshold_triggered" boolean DEFAULT false NOT NULL,
	"safety_drop_percentage" numeric(5, 2),
	"admin_override_safety" boolean DEFAULT false NOT NULL,
	"admin_override_reason" text,
	"approved_by_user_id" uuid,
	"error_log" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"committed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "catalog_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(60) NOT NULL,
	"name" varchar(150) NOT NULL,
	"type" varchar(50) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_sources_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"name" varchar(100) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"description" text,
	"image_url" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"variant_id" uuid NOT NULL,
	"inventory_source_id" uuid NOT NULL,
	"physical_quantity" integer DEFAULT 0 NOT NULL,
	"reserved_quantity" integer DEFAULT 0 NOT NULL,
	"last_synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source_timestamp" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(60) NOT NULL,
	"name" varchar(150) NOT NULL,
	"type" varchar(50) DEFAULT 'physical_store' NOT NULL,
	"is_online_fulfillment" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_sources_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid,
	"variant_id" uuid,
	"captured_product_name" varchar(255) NOT NULL,
	"captured_variant_name" varchar(150) NOT NULL,
	"captured_sku" varchar(100),
	"captured_unit_price" numeric(12, 2) NOT NULL,
	"quantity" integer NOT NULL,
	"captured_line_total" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_reference" varchar(60) NOT NULL,
	"channel" varchar(40) DEFAULT 'whatsapp' NOT NULL,
	"status" varchar(40) DEFAULT 'pending' NOT NULL,
	"customer_name" varchar(150) NOT NULL,
	"customer_phone" varchar(50) NOT NULL,
	"customer_city" varchar(100) NOT NULL,
	"delivery_address" text,
	"currency" varchar(10) DEFAULT 'MAD' NOT NULL,
	"subtotal" numeric(12, 2) NOT NULL,
	"shipping_fee" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"customer_notes" text,
	"admin_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_order_reference_unique" UNIQUE("order_reference")
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"source_url" text NOT NULL,
	"local_path" text,
	"image_source_type" varchar(40) DEFAULT 'external_supplier' NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"alt_text" varchar(255) DEFAULT 'Photo produit CITY Électronique' NOT NULL,
	"verification_status" varchar(30) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_source_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"source_product_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"confidence_score" numeric(5, 2) DEFAULT '1.00' NOT NULL,
	"needs_manual_review" boolean DEFAULT false NOT NULL,
	"review_notes" text,
	"mapped_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"sku" varchar(100),
	"barcode" varchar(100),
	"model_number" varchar(100),
	"name" varchar(150) NOT NULL,
	"is_default_variant" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"derived_price" numeric(12, 2),
	"override_price" numeric(12, 2),
	"is_price_overridden" boolean DEFAULT false NOT NULL,
	"compare_at_price" numeric(12, 2),
	"specifications" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(280) NOT NULL,
	"brand_id" uuid,
	"category_id" uuid,
	"seo_title" varchar(150),
	"seo_description" varchar(255),
	"is_published" boolean DEFAULT true NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"merchandising_priority" integer DEFAULT 0 NOT NULL,
	"custom_badges" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"editorial_notes" text,
	"derived_name" varchar(255) NOT NULL,
	"override_name" varchar(255),
	"is_name_overridden" boolean DEFAULT false NOT NULL,
	"derived_description" text,
	"override_description" text,
	"is_description_overridden" boolean DEFAULT false NOT NULL,
	"derived_price" numeric(12, 2) NOT NULL,
	"override_price" numeric(12, 2),
	"is_price_overridden" boolean DEFAULT false NOT NULL,
	"compare_at_price" numeric(12, 2),
	"cost_price" numeric(12, 2),
	"overrides_meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"availability_status" varchar(40) DEFAULT 'in_stock' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "source_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"source_record_id" varchar(150) NOT NULL,
	"source_sku" varchar(100),
	"source_barcode" varchar(100),
	"source_name" varchar(255) NOT NULL,
	"source_description" text,
	"source_category" varchar(150),
	"source_brand" varchar(150),
	"source_price" numeric(12, 2) NOT NULL,
	"source_raw_stock" integer DEFAULT 0,
	"source_image_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source_specifications" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"raw_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_checksum" varchar(64),
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_user_id_admin_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_admin_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_import_items" ADD CONSTRAINT "catalog_import_items_import_id_catalog_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."catalog_imports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_imports" ADD CONSTRAINT "catalog_imports_source_id_catalog_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."catalog_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_imports" ADD CONSTRAINT "catalog_imports_approved_by_user_id_admin_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_inventory_source_id_inventory_sources_id_fk" FOREIGN KEY ("inventory_source_id") REFERENCES "public"."inventory_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_source_mappings" ADD CONSTRAINT "product_source_mappings_source_id_catalog_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."catalog_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_source_mappings" ADD CONSTRAINT "product_source_mappings_source_product_id_source_products_id_fk" FOREIGN KEY ("source_product_id") REFERENCES "public"."source_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_source_mappings" ADD CONSTRAINT "product_source_mappings_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_source_mappings" ADD CONSTRAINT "product_source_mappings_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_products" ADD CONSTRAINT "source_products_source_id_catalog_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."catalog_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_admin_sessions_user" ON "admin_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_admin_sessions_token" ON "admin_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "idx_admin_sessions_expires" ON "admin_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_admin_users_email" ON "admin_users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_action" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_entity" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_created" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_brands_slug" ON "brands" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_import_items_import" ON "catalog_import_items" USING btree ("import_id");--> statement-breakpoint
CREATE INDEX "idx_import_items_action" ON "catalog_import_items" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_catalog_imports_source" ON "catalog_imports" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "idx_catalog_imports_status" ON "catalog_imports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_catalog_sources_code" ON "catalog_sources" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_categories_slug" ON "categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_categories_parent" ON "categories" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_inventory_variant_source" ON "inventory_items" USING btree ("variant_id","inventory_source_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_variant" ON "inventory_items" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_sources_code" ON "inventory_sources" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_order_items_order" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_orders_reference" ON "orders" USING btree ("order_reference");--> statement-breakpoint
CREATE INDEX "idx_orders_phone" ON "orders" USING btree ("customer_phone");--> statement-breakpoint
CREATE INDEX "idx_orders_status" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_orders_created" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_product_images_product" ON "product_images" USING btree ("product_id","display_order");--> statement-breakpoint
CREATE INDEX "idx_product_images_variant" ON "product_images" USING btree ("variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_source_variant_mapping" ON "product_source_mappings" USING btree ("source_id","source_product_id","variant_id");--> statement-breakpoint
CREATE INDEX "idx_mappings_product" ON "product_source_mappings" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_mappings_review" ON "product_source_mappings" USING btree ("needs_manual_review");--> statement-breakpoint
CREATE INDEX "idx_variants_product" ON "product_variants" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_variants_sku" ON "product_variants" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "idx_variants_barcode" ON "product_variants" USING btree ("barcode");--> statement-breakpoint
CREATE INDEX "idx_products_slug" ON "products" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_products_brand" ON "products" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "idx_products_category" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_products_status" ON "products" USING btree ("is_published","availability_status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_source_products_composite" ON "source_products" USING btree ("source_id","source_record_id");--> statement-breakpoint
CREATE INDEX "idx_source_products_sku" ON "source_products" USING btree ("source_sku");--> statement-breakpoint
CREATE INDEX "idx_source_products_barcode" ON "source_products" USING btree ("source_barcode");