-- AlterTable
ALTER TABLE "customers" ADD COLUMN "region" TEXT;

-- AlterTable
ALTER TABLE "employees" ADD COLUMN "region" TEXT;

-- AlterTable
ALTER TABLE "payroll_tax_rules" ADD COLUMN "region" TEXT;

-- AlterTable
ALTER TABLE "vendors" ADD COLUMN "region" TEXT;

-- CreateTable
CREATE TABLE "gl_fiscal_periods" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "start_date" DATETIME NOT NULL,
    "end_date" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "created_by_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_by_id" TEXT,
    "closed_at" DATETIME,
    "reopened_by_id" TEXT,
    "reopened_at" DATETIME,
    CONSTRAINT "gl_fiscal_periods_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "gl_fiscal_periods_closed_by_id_fkey" FOREIGN KEY ("closed_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "gl_fiscal_periods_reopened_by_id_fkey" FOREIGN KEY ("reopened_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_budgets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "fiscal_year" INTEGER NOT NULL,
    "start_date" DATETIME NOT NULL,
    "end_date" DATETIME NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "alert_threshold_percent" DECIMAL NOT NULL DEFAULT 90,
    "version" INTEGER NOT NULL DEFAULT 1,
    "revised_from_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "submitted_by_id" TEXT,
    "submitted_at" DATETIME,
    "approved_by_id" TEXT,
    "approved_at" DATETIME,
    "activated_by_id" TEXT,
    "activated_at" DATETIME,
    "closed_at" DATETIME,
    "cancelled_at" DATETIME,
    CONSTRAINT "budgets_revised_from_id_fkey" FOREIGN KEY ("revised_from_id") REFERENCES "budgets" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "budgets_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "budgets_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "budgets_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "budgets_activated_by_id_fkey" FOREIGN KEY ("activated_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_budgets" ("activated_at", "activated_by_id", "approved_at", "approved_by_id", "cancelled_at", "closed_at", "created_at", "created_by_id", "description", "end_date", "fiscal_year", "id", "name", "revised_from_id", "start_date", "status", "submitted_at", "submitted_by_id", "updated_at", "version") SELECT "activated_at", "activated_by_id", "approved_at", "approved_by_id", "cancelled_at", "closed_at", "created_at", "created_by_id", "description", "end_date", "fiscal_year", "id", "name", "revised_from_id", "start_date", "status", "submitted_at", "submitted_by_id", "updated_at", "version" FROM "budgets";
DROP TABLE "budgets";
ALTER TABLE "new_budgets" RENAME TO "budgets";
CREATE INDEX "budgets_fiscal_year_idx" ON "budgets"("fiscal_year");
CREATE INDEX "budgets_status_idx" ON "budgets"("status");
CREATE TABLE "new_gl_accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_cash_account" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "parent_id" TEXT,
    CONSTRAINT "gl_accounts_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "gl_accounts" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_gl_accounts" ("code", "created_at", "description", "id", "is_active", "name", "parent_id", "type", "updated_at") SELECT "code", "created_at", "description", "id", "is_active", "name", "parent_id", "type", "updated_at" FROM "gl_accounts";
DROP TABLE "gl_accounts";
ALTER TABLE "new_gl_accounts" RENAME TO "gl_accounts";
CREATE UNIQUE INDEX "gl_accounts_code_key" ON "gl_accounts"("code");
CREATE INDEX "gl_accounts_type_idx" ON "gl_accounts"("type");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "gl_fiscal_periods_start_date_end_date_idx" ON "gl_fiscal_periods"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_type_entity_type_entity_id_idx" ON "notifications"("type", "entity_type", "entity_id");
