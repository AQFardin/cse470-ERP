-- CreateTable
CREATE TABLE "production_orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order_number" TEXT NOT NULL,
    "bom_version_id" TEXT NOT NULL,
    "finished_variant_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" DATETIME,
    CONSTRAINT "production_orders_bom_version_id_fkey" FOREIGN KEY ("bom_version_id") REFERENCES "bom_versions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "production_orders_finished_variant_id_fkey" FOREIGN KEY ("finished_variant_id") REFERENCES "product_variants" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "production_order_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "production_order_id" TEXT NOT NULL,
    "component_variant_id" TEXT NOT NULL,
    "required_quantity" INTEGER NOT NULL,
    "consumed_quantity" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "production_order_items_production_order_id_fkey" FOREIGN KEY ("production_order_id") REFERENCES "production_orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "production_order_items_component_variant_id_fkey" FOREIGN KEY ("component_variant_id") REFERENCES "product_variants" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "production_orders_order_number_key" ON "production_orders"("order_number");

-- CreateIndex
CREATE INDEX "production_orders_bom_version_id_idx" ON "production_orders"("bom_version_id");

-- CreateIndex
CREATE INDEX "production_orders_finished_variant_id_idx" ON "production_orders"("finished_variant_id");

-- CreateIndex
CREATE INDEX "production_orders_status_idx" ON "production_orders"("status");

-- CreateIndex
CREATE INDEX "production_order_items_component_variant_id_idx" ON "production_order_items"("component_variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "production_order_items_production_order_id_component_variant_id_key" ON "production_order_items"("production_order_id", "component_variant_id");
