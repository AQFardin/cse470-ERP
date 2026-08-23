-- CreateTable
CREATE TABLE "bill_of_materials" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "finished_variant_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "bill_of_materials_finished_variant_id_fkey" FOREIGN KEY ("finished_variant_id") REFERENCES "product_variants" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "bom_versions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bom_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bom_versions_bom_id_fkey" FOREIGN KEY ("bom_id") REFERENCES "bill_of_materials" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "bom_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bom_version_id" TEXT NOT NULL,
    "component_variant_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "bom_items_bom_version_id_fkey" FOREIGN KEY ("bom_version_id") REFERENCES "bom_versions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "bom_items_component_variant_id_fkey" FOREIGN KEY ("component_variant_id") REFERENCES "product_variants" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "bill_of_materials_finished_variant_id_idx" ON "bill_of_materials"("finished_variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "bom_versions_bom_id_version_key" ON "bom_versions"("bom_id", "version");

-- CreateIndex
CREATE INDEX "bom_items_component_variant_id_idx" ON "bom_items"("component_variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "bom_items_bom_version_id_component_variant_id_key" ON "bom_items"("bom_version_id", "component_variant_id");
