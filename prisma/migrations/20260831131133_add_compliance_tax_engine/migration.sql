-- CreateTable
CREATE TABLE "compliance_tax_codes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "region" TEXT,
    "category" TEXT NOT NULL DEFAULT 'STANDARD',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "compliance_tax_rates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tax_code_id" TEXT NOT NULL,
    "rate_percent" DECIMAL NOT NULL,
    "effective_from" DATETIME NOT NULL,
    "effective_to" DATETIME,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "compliance_tax_rates_tax_code_id_fkey" FOREIGN KEY ("tax_code_id") REFERENCES "compliance_tax_codes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "compliance_tax_periods" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "start_date" DATETIME NOT NULL,
    "end_date" DATETIME NOT NULL,
    "due_date" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "output_tax" DECIMAL,
    "input_tax" DECIMAL,
    "adjustments" DECIMAL NOT NULL DEFAULT 0,
    "net_payable" DECIMAL,
    "calculated_at" DATETIME,
    "created_by_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "reviewed_by_id" TEXT,
    "reviewed_at" DATETIME,
    "finalized_by_id" TEXT,
    "finalized_at" DATETIME,
    "filed_by_id" TEXT,
    "filed_at" DATETIME,
    "closed_at" DATETIME,
    CONSTRAINT "compliance_tax_periods_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "compliance_tax_periods_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "compliance_tax_periods_finalized_by_id_fkey" FOREIGN KEY ("finalized_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "compliance_tax_periods_filed_by_id_fkey" FOREIGN KEY ("filed_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "compliance_tax_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source_type" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "transaction_date" DATETIME NOT NULL,
    "direction" TEXT NOT NULL,
    "tax_code_id" TEXT NOT NULL,
    "tax_rate_id" TEXT,
    "category" TEXT NOT NULL,
    "rate_percent" DECIMAL NOT NULL,
    "taxable_amount" DECIMAL NOT NULL,
    "tax_amount" DECIMAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "tax_period_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "compliance_tax_transactions_tax_code_id_fkey" FOREIGN KEY ("tax_code_id") REFERENCES "compliance_tax_codes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "compliance_tax_transactions_tax_rate_id_fkey" FOREIGN KEY ("tax_rate_id") REFERENCES "compliance_tax_rates" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "compliance_tax_transactions_tax_period_id_fkey" FOREIGN KEY ("tax_period_id") REFERENCES "compliance_tax_periods" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "compliance_tax_payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tax_period_id" TEXT NOT NULL,
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
    CONSTRAINT "compliance_tax_payments_tax_period_id_fkey" FOREIGN KEY ("tax_period_id") REFERENCES "compliance_tax_periods" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "compliance_tax_payments_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "gl_accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "compliance_tax_payments_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "gl_journal_entries" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "compliance_tax_payments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "compliance_tax_payments_reversed_by_id_fkey" FOREIGN KEY ("reversed_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ap_vendor_bills" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bill_number" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "bill_date" DATETIME NOT NULL,
    "due_date" DATETIME NOT NULL,
    "reference_number" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "subtotal" DECIMAL NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL NOT NULL DEFAULT 0,
    "total_amount" DECIMAL NOT NULL DEFAULT 0,
    "paid_amount" DECIMAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "expense_account_id" TEXT NOT NULL,
    "payable_account_id" TEXT NOT NULL,
    "tax_code_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "approved_by_id" TEXT,
    "approved_at" DATETIME,
    "journal_entry_id" TEXT,
    CONSTRAINT "ap_vendor_bills_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ap_vendor_bills_expense_account_id_fkey" FOREIGN KEY ("expense_account_id") REFERENCES "gl_accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ap_vendor_bills_payable_account_id_fkey" FOREIGN KEY ("payable_account_id") REFERENCES "gl_accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ap_vendor_bills_tax_code_id_fkey" FOREIGN KEY ("tax_code_id") REFERENCES "compliance_tax_codes" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ap_vendor_bills_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ap_vendor_bills_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ap_vendor_bills_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "gl_journal_entries" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ap_vendor_bills" ("approved_at", "approved_by_id", "bill_date", "bill_number", "created_at", "created_by_id", "currency", "discount_amount", "due_date", "expense_account_id", "id", "journal_entry_id", "notes", "paid_amount", "payable_account_id", "reference_number", "status", "subtotal", "tax_amount", "total_amount", "updated_at", "vendor_id") SELECT "approved_at", "approved_by_id", "bill_date", "bill_number", "created_at", "created_by_id", "currency", "discount_amount", "due_date", "expense_account_id", "id", "journal_entry_id", "notes", "paid_amount", "payable_account_id", "reference_number", "status", "subtotal", "tax_amount", "total_amount", "updated_at", "vendor_id" FROM "ap_vendor_bills";
DROP TABLE "ap_vendor_bills";
ALTER TABLE "new_ap_vendor_bills" RENAME TO "ap_vendor_bills";
CREATE UNIQUE INDEX "ap_vendor_bills_bill_number_key" ON "ap_vendor_bills"("bill_number");
CREATE UNIQUE INDEX "ap_vendor_bills_journal_entry_id_key" ON "ap_vendor_bills"("journal_entry_id");
CREATE INDEX "ap_vendor_bills_status_idx" ON "ap_vendor_bills"("status");
CREATE INDEX "ap_vendor_bills_due_date_idx" ON "ap_vendor_bills"("due_date");
CREATE TABLE "new_ar_customer_invoices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoice_number" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "invoice_date" DATETIME NOT NULL,
    "due_date" DATETIME NOT NULL,
    "reference_number" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "subtotal" DECIMAL NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL NOT NULL DEFAULT 0,
    "total_amount" DECIMAL NOT NULL DEFAULT 0,
    "paid_amount" DECIMAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "revenue_account_id" TEXT NOT NULL,
    "receivable_account_id" TEXT NOT NULL,
    "tax_code_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "issued_by_id" TEXT,
    "issued_at" DATETIME,
    "journal_entry_id" TEXT,
    CONSTRAINT "ar_customer_invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ar_customer_invoices_revenue_account_id_fkey" FOREIGN KEY ("revenue_account_id") REFERENCES "gl_accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ar_customer_invoices_receivable_account_id_fkey" FOREIGN KEY ("receivable_account_id") REFERENCES "gl_accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ar_customer_invoices_tax_code_id_fkey" FOREIGN KEY ("tax_code_id") REFERENCES "compliance_tax_codes" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ar_customer_invoices_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ar_customer_invoices_issued_by_id_fkey" FOREIGN KEY ("issued_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ar_customer_invoices_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "gl_journal_entries" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ar_customer_invoices" ("created_at", "created_by_id", "currency", "customer_id", "discount_amount", "due_date", "id", "invoice_date", "invoice_number", "issued_at", "issued_by_id", "journal_entry_id", "notes", "paid_amount", "receivable_account_id", "reference_number", "revenue_account_id", "status", "subtotal", "tax_amount", "total_amount", "updated_at") SELECT "created_at", "created_by_id", "currency", "customer_id", "discount_amount", "due_date", "id", "invoice_date", "invoice_number", "issued_at", "issued_by_id", "journal_entry_id", "notes", "paid_amount", "receivable_account_id", "reference_number", "revenue_account_id", "status", "subtotal", "tax_amount", "total_amount", "updated_at" FROM "ar_customer_invoices";
DROP TABLE "ar_customer_invoices";
ALTER TABLE "new_ar_customer_invoices" RENAME TO "ar_customer_invoices";
CREATE UNIQUE INDEX "ar_customer_invoices_invoice_number_key" ON "ar_customer_invoices"("invoice_number");
CREATE UNIQUE INDEX "ar_customer_invoices_journal_entry_id_key" ON "ar_customer_invoices"("journal_entry_id");
CREATE INDEX "ar_customer_invoices_status_idx" ON "ar_customer_invoices"("status");
CREATE INDEX "ar_customer_invoices_due_date_idx" ON "ar_customer_invoices"("due_date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "compliance_tax_codes_code_key" ON "compliance_tax_codes"("code");

-- CreateIndex
CREATE INDEX "compliance_tax_rates_tax_code_id_effective_from_idx" ON "compliance_tax_rates"("tax_code_id", "effective_from");

-- CreateIndex
CREATE INDEX "compliance_tax_periods_status_idx" ON "compliance_tax_periods"("status");

-- CreateIndex
CREATE INDEX "compliance_tax_transactions_source_type_source_id_idx" ON "compliance_tax_transactions"("source_type", "source_id");

-- CreateIndex
CREATE INDEX "compliance_tax_transactions_transaction_date_idx" ON "compliance_tax_transactions"("transaction_date");

-- CreateIndex
CREATE INDEX "compliance_tax_transactions_tax_period_id_idx" ON "compliance_tax_transactions"("tax_period_id");

-- CreateIndex
CREATE INDEX "compliance_tax_transactions_direction_idx" ON "compliance_tax_transactions"("direction");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_tax_payments_tax_period_id_key" ON "compliance_tax_payments"("tax_period_id");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_tax_payments_journal_entry_id_key" ON "compliance_tax_payments"("journal_entry_id");
