-- CreateTable
CREATE TABLE "budgets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "fiscal_year" INTEGER NOT NULL,
    "start_date" DATETIME NOT NULL,
    "end_date" DATETIME NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
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

-- CreateTable
CREATE TABLE "budget_lines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "budget_id" TEXT NOT NULL,
    "department" TEXT,
    "account_id" TEXT NOT NULL,
    "annual_amount" DECIMAL NOT NULL,
    "notes" TEXT,
    CONSTRAINT "budget_lines_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budgets" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "budget_lines_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "gl_accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "budget_line_months" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "budget_line_id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "amount" DECIMAL NOT NULL,
    CONSTRAINT "budget_line_months_budget_line_id_fkey" FOREIGN KEY ("budget_line_id") REFERENCES "budget_lines" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "budgets_fiscal_year_idx" ON "budgets"("fiscal_year");

-- CreateIndex
CREATE INDEX "budgets_status_idx" ON "budgets"("status");

-- CreateIndex
CREATE INDEX "budget_lines_budget_id_idx" ON "budget_lines"("budget_id");

-- CreateIndex
CREATE INDEX "budget_lines_account_id_idx" ON "budget_lines"("account_id");

-- CreateIndex
CREATE INDEX "budget_lines_department_idx" ON "budget_lines"("department");

-- CreateIndex
CREATE UNIQUE INDEX "budget_lines_budget_id_department_account_id_key" ON "budget_lines"("budget_id", "department", "account_id");

-- CreateIndex
CREATE UNIQUE INDEX "budget_line_months_budget_line_id_month_key" ON "budget_line_months"("budget_line_id", "month");
