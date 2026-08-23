/*
  Warnings:

  - Added the required column `warehouse_id` to the `production_orders` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_production_orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order_number" TEXT NOT NULL,
    "bom_version_id" TEXT NOT NULL,
    "finished_variant_id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" DATETIME,
    CONSTRAINT "production_orders_bom_version_id_fkey" FOREIGN KEY ("bom_version_id") REFERENCES "bom_versions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "production_orders_finished_variant_id_fkey" FOREIGN KEY ("finished_variant_id") REFERENCES "product_variants" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "production_orders_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_production_orders" ("bom_version_id", "completed_at", "created_at", "finished_variant_id", "id", "order_number", "quantity", "status") SELECT "bom_version_id", "completed_at", "created_at", "finished_variant_id", "id", "order_number", "quantity", "status" FROM "production_orders";
DROP TABLE "production_orders";
ALTER TABLE "new_production_orders" RENAME TO "production_orders";
CREATE UNIQUE INDEX "production_orders_order_number_key" ON "production_orders"("order_number");
CREATE INDEX "production_orders_bom_version_id_idx" ON "production_orders"("bom_version_id");
CREATE INDEX "production_orders_finished_variant_id_idx" ON "production_orders"("finished_variant_id");
CREATE INDEX "production_orders_warehouse_id_idx" ON "production_orders"("warehouse_id");
CREATE INDEX "production_orders_status_idx" ON "production_orders"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
