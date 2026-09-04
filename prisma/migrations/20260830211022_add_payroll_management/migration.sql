-- CreateTable
CREATE TABLE "payroll_salary_components" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "calcType" TEXT NOT NULL DEFAULT 'FIXED',
    "isTaxable" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "payroll_employee_salaries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employee_id" TEXT NOT NULL,
    "basic_salary" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "effective_from" DATETIME NOT NULL,
    "notes" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payroll_employee_salaries_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "payroll_employee_salaries_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payroll_employee_salary_component_values" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employee_salary_id" TEXT NOT NULL,
    "salary_component_id" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    CONSTRAINT "payroll_employee_salary_component_values_employee_salary_id_fkey" FOREIGN KEY ("employee_salary_id") REFERENCES "payroll_employee_salaries" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "payroll_employee_salary_component_values_salary_component_id_fkey" FOREIGN KEY ("salary_component_id") REFERENCES "payroll_salary_components" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payroll_tax_rules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "exemption_amount" DECIMAL NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "payroll_tax_slabs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tax_rule_id" TEXT NOT NULL,
    "min_amount" DECIMAL NOT NULL,
    "max_amount" DECIMAL,
    "rate_percent" DECIMAL NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "payroll_tax_slabs_tax_rule_id_fkey" FOREIGN KEY ("tax_rule_id") REFERENCES "payroll_tax_rules" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payroll_periods" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "start_date" DATETIME NOT NULL,
    "end_date" DATETIME NOT NULL,
    "pay_date" DATETIME NOT NULL,
    "working_days" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "tax_rule_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "calculated_at" DATETIME,
    "approved_by_id" TEXT,
    "approved_at" DATETIME,
    "journal_entry_id" TEXT,
    CONSTRAINT "payroll_periods_tax_rule_id_fkey" FOREIGN KEY ("tax_rule_id") REFERENCES "payroll_tax_rules" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "payroll_periods_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "payroll_periods_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "payroll_periods_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "gl_journal_entries" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payroll_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "payroll_period_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "department_snapshot" TEXT NOT NULL,
    "position_snapshot" TEXT NOT NULL,
    "basic_salary" DECIMAL NOT NULL,
    "allowances_total" DECIMAL NOT NULL,
    "bonus_total" DECIMAL NOT NULL,
    "gross_earnings" DECIMAL NOT NULL,
    "taxable_income" DECIMAL NOT NULL,
    "tax_amount" DECIMAL NOT NULL,
    "unpaid_leave_deduction" DECIMAL NOT NULL,
    "other_deductions_total" DECIMAL NOT NULL,
    "total_deductions" DECIMAL NOT NULL,
    "net_salary" DECIMAL NOT NULL,
    "working_days" INTEGER NOT NULL,
    "unpaid_leave_days" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payroll_records_payroll_period_id_fkey" FOREIGN KEY ("payroll_period_id") REFERENCES "payroll_periods" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "payroll_records_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payroll_record_lines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "payroll_record_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    CONSTRAINT "payroll_record_lines_payroll_record_id_fkey" FOREIGN KEY ("payroll_record_id") REFERENCES "payroll_records" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payroll_bonuses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employee_id" TEXT NOT NULL,
    "payroll_period_id" TEXT NOT NULL,
    "bonus_type" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_by_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_by_id" TEXT,
    "approved_at" DATETIME,
    CONSTRAINT "payroll_bonuses_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "payroll_bonuses_payroll_period_id_fkey" FOREIGN KEY ("payroll_period_id") REFERENCES "payroll_periods" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "payroll_bonuses_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "payroll_bonuses_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payroll_deductions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employee_id" TEXT NOT NULL,
    "payroll_period_id" TEXT NOT NULL,
    "deduction_type" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_by_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_by_id" TEXT,
    "approved_at" DATETIME,
    CONSTRAINT "payroll_deductions_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "payroll_deductions_payroll_period_id_fkey" FOREIGN KEY ("payroll_period_id") REFERENCES "payroll_periods" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "payroll_deductions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "payroll_deductions_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payroll_payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "payroll_period_id" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "payment_date" DATETIME NOT NULL,
    "payment_method" TEXT NOT NULL,
    "reference_number" TEXT,
    "status" TEXT NOT NULL DEFAULT 'POSTED',
    "bank_account_id" TEXT NOT NULL,
    "journal_entry_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reversed_by_id" TEXT,
    "reversed_at" DATETIME,
    CONSTRAINT "payroll_payments_payroll_period_id_fkey" FOREIGN KEY ("payroll_period_id") REFERENCES "payroll_periods" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "payroll_payments_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "gl_accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "payroll_payments_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "gl_journal_entries" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "payroll_payments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "payroll_payments_reversed_by_id_fkey" FOREIGN KEY ("reversed_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "payroll_salary_components_name_key" ON "payroll_salary_components"("name");

-- CreateIndex
CREATE INDEX "payroll_employee_salaries_employee_id_effective_from_idx" ON "payroll_employee_salaries"("employee_id", "effective_from");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_employee_salary_component_values_employee_salary_id_salary_component_id_key" ON "payroll_employee_salary_component_values"("employee_salary_id", "salary_component_id");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_periods_journal_entry_id_key" ON "payroll_periods"("journal_entry_id");

-- CreateIndex
CREATE INDEX "payroll_periods_status_idx" ON "payroll_periods"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_records_payroll_period_id_employee_id_key" ON "payroll_records"("payroll_period_id", "employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_bonuses_employee_id_payroll_period_id_bonus_type_key" ON "payroll_bonuses"("employee_id", "payroll_period_id", "bonus_type");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_deductions_employee_id_payroll_period_id_deduction_type_key" ON "payroll_deductions"("employee_id", "payroll_period_id", "deduction_type");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_payments_payroll_period_id_key" ON "payroll_payments"("payroll_period_id");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_payments_journal_entry_id_key" ON "payroll_payments"("journal_entry_id");
