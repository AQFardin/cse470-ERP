-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customer_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lead_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "qualification_stat" TEXT NOT NULL DEFAULT 'NEW',
    "score" INTEGER NOT NULL DEFAULT 0,
    "converted_customer_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "leads_converted_customer_id_fkey" FOREIGN KEY ("converted_customer_id") REFERENCES "customers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sales_pipelines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pipeline_id" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'PROSPECTING',
    "deal_value" DECIMAL NOT NULL,
    "expected_close_date" DATETIME NOT NULL,
    "customer_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "sales_pipelines_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "sales_pipelines_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "interaction_histories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "interaction_id" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "notes" TEXT,
    "customer_id" TEXT NOT NULL,
    CONSTRAINT "interaction_histories_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sales_reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "report_id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "revenue" DECIMAL NOT NULL DEFAULT 0,
    "deals_closed" INTEGER NOT NULL DEFAULT 0,
    "deals_lost" INTEGER NOT NULL DEFAULT 0,
    "employee_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sales_reports_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "customers_customer_id_key" ON "customers"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "leads_lead_id_key" ON "leads"("lead_id");

-- CreateIndex
CREATE UNIQUE INDEX "leads_converted_customer_id_key" ON "leads"("converted_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_pipelines_pipeline_id_key" ON "sales_pipelines"("pipeline_id");

-- CreateIndex
CREATE UNIQUE INDEX "interaction_histories_interaction_id_key" ON "interaction_histories"("interaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_reports_report_id_key" ON "sales_reports"("report_id");
