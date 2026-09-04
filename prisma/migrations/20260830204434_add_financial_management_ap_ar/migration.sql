-- CreateTable
CREATE TABLE "account_mappings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "account_mappings_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "gl_accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vendor_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ap_vendor_bills" (
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
    "created_by_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "approved_by_id" TEXT,
    "approved_at" DATETIME,
    "journal_entry_id" TEXT,
    CONSTRAINT "ap_vendor_bills_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ap_vendor_bills_expense_account_id_fkey" FOREIGN KEY ("expense_account_id") REFERENCES "gl_accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ap_vendor_bills_payable_account_id_fkey" FOREIGN KEY ("payable_account_id") REFERENCES "gl_accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ap_vendor_bills_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ap_vendor_bills_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ap_vendor_bills_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "gl_journal_entries" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ap_vendor_bill_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vendor_bill_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL DEFAULT 1,
    "unit_price" DECIMAL NOT NULL,
    "amount" DECIMAL NOT NULL,
    "product_id" TEXT,
    CONSTRAINT "ap_vendor_bill_items_vendor_bill_id_fkey" FOREIGN KEY ("vendor_bill_id") REFERENCES "ap_vendor_bills" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ap_vendor_bill_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ap_vendor_payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "payment_number" TEXT NOT NULL,
    "vendor_bill_id" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "payment_date" DATETIME NOT NULL,
    "payment_method" TEXT NOT NULL,
    "reference_number" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'POSTED',
    "bank_account_id" TEXT NOT NULL,
    "journal_entry_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reversed_by_id" TEXT,
    "reversed_at" DATETIME,
    CONSTRAINT "ap_vendor_payments_vendor_bill_id_fkey" FOREIGN KEY ("vendor_bill_id") REFERENCES "ap_vendor_bills" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ap_vendor_payments_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "gl_accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ap_vendor_payments_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "gl_journal_entries" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ap_vendor_payments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ap_vendor_payments_reversed_by_id_fkey" FOREIGN KEY ("reversed_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ar_customer_invoices" (
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
    "created_by_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "issued_by_id" TEXT,
    "issued_at" DATETIME,
    "journal_entry_id" TEXT,
    CONSTRAINT "ar_customer_invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ar_customer_invoices_revenue_account_id_fkey" FOREIGN KEY ("revenue_account_id") REFERENCES "gl_accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ar_customer_invoices_receivable_account_id_fkey" FOREIGN KEY ("receivable_account_id") REFERENCES "gl_accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ar_customer_invoices_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ar_customer_invoices_issued_by_id_fkey" FOREIGN KEY ("issued_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ar_customer_invoices_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "gl_journal_entries" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ar_customer_invoice_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customer_invoice_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL DEFAULT 1,
    "unit_price" DECIMAL NOT NULL,
    "amount" DECIMAL NOT NULL,
    "product_id" TEXT,
    CONSTRAINT "ar_customer_invoice_items_customer_invoice_id_fkey" FOREIGN KEY ("customer_invoice_id") REFERENCES "ar_customer_invoices" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ar_customer_invoice_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ar_customer_payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "payment_number" TEXT NOT NULL,
    "customer_invoice_id" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "payment_date" DATETIME NOT NULL,
    "payment_method" TEXT NOT NULL,
    "reference_number" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'POSTED',
    "bank_account_id" TEXT NOT NULL,
    "journal_entry_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reversed_by_id" TEXT,
    "reversed_at" DATETIME,
    CONSTRAINT "ar_customer_payments_customer_invoice_id_fkey" FOREIGN KEY ("customer_invoice_id") REFERENCES "ar_customer_invoices" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ar_customer_payments_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "gl_accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ar_customer_payments_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "gl_journal_entries" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ar_customer_payments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ar_customer_payments_reversed_by_id_fkey" FOREIGN KEY ("reversed_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "account_mappings_key_key" ON "account_mappings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_vendor_id_key" ON "vendors"("vendor_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_email_key" ON "vendors"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ap_vendor_bills_bill_number_key" ON "ap_vendor_bills"("bill_number");

-- CreateIndex
CREATE UNIQUE INDEX "ap_vendor_bills_journal_entry_id_key" ON "ap_vendor_bills"("journal_entry_id");

-- CreateIndex
CREATE INDEX "ap_vendor_bills_status_idx" ON "ap_vendor_bills"("status");

-- CreateIndex
CREATE INDEX "ap_vendor_bills_due_date_idx" ON "ap_vendor_bills"("due_date");

-- CreateIndex
CREATE UNIQUE INDEX "ap_vendor_payments_payment_number_key" ON "ap_vendor_payments"("payment_number");

-- CreateIndex
CREATE UNIQUE INDEX "ap_vendor_payments_journal_entry_id_key" ON "ap_vendor_payments"("journal_entry_id");

-- CreateIndex
CREATE UNIQUE INDEX "ar_customer_invoices_invoice_number_key" ON "ar_customer_invoices"("invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX "ar_customer_invoices_journal_entry_id_key" ON "ar_customer_invoices"("journal_entry_id");

-- CreateIndex
CREATE INDEX "ar_customer_invoices_status_idx" ON "ar_customer_invoices"("status");

-- CreateIndex
CREATE INDEX "ar_customer_invoices_due_date_idx" ON "ar_customer_invoices"("due_date");

-- CreateIndex
CREATE UNIQUE INDEX "ar_customer_payments_payment_number_key" ON "ar_customer_payments"("payment_number");

-- CreateIndex
CREATE UNIQUE INDEX "ar_customer_payments_journal_entry_id_key" ON "ar_customer_payments"("journal_entry_id");
