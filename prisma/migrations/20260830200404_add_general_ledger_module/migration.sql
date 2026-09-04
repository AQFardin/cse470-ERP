-- CreateTable
CREATE TABLE "gl_accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "parent_id" TEXT,
    CONSTRAINT "gl_accounts_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "gl_accounts" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "gl_journal_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entry_number" TEXT NOT NULL,
    "transaction_date" DATETIME NOT NULL,
    "description" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "created_by_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "posted_by_id" TEXT,
    "posted_at" DATETIME,
    "locked_at" DATETIME,
    "reversal_of_id" TEXT,
    "idempotency_key" TEXT,
    CONSTRAINT "gl_journal_entries_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "gl_journal_entries_posted_by_id_fkey" FOREIGN KEY ("posted_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "gl_journal_entries_reversal_of_id_fkey" FOREIGN KEY ("reversal_of_id") REFERENCES "gl_journal_entries" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "gl_journal_lines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT,
    "debit" DECIMAL NOT NULL DEFAULT 0,
    "credit" DECIMAL NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "journal_entry_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    CONSTRAINT "gl_journal_lines_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "gl_journal_entries" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "gl_journal_lines_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "gl_accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "gl_accounts_code_key" ON "gl_accounts"("code");

-- CreateIndex
CREATE INDEX "gl_accounts_type_idx" ON "gl_accounts"("type");

-- CreateIndex
CREATE UNIQUE INDEX "gl_journal_entries_entry_number_key" ON "gl_journal_entries"("entry_number");

-- CreateIndex
CREATE UNIQUE INDEX "gl_journal_entries_reversal_of_id_key" ON "gl_journal_entries"("reversal_of_id");

-- CreateIndex
CREATE UNIQUE INDEX "gl_journal_entries_idempotency_key_key" ON "gl_journal_entries"("idempotency_key");

-- CreateIndex
CREATE INDEX "gl_journal_entries_status_idx" ON "gl_journal_entries"("status");

-- CreateIndex
CREATE INDEX "gl_journal_entries_transaction_date_idx" ON "gl_journal_entries"("transaction_date");

-- CreateIndex
CREATE INDEX "gl_journal_lines_account_id_idx" ON "gl_journal_lines"("account_id");

-- CreateIndex
CREATE INDEX "gl_journal_lines_journal_entry_id_idx" ON "gl_journal_lines"("journal_entry_id");
