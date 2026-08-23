-- CreateTable
CREATE TABLE "membership_plans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "price" DECIMAL NOT NULL,
    "billing_interval_days" INTEGER NOT NULL DEFAULT 30
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "start_date" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "auto_renew" BOOLEAN NOT NULL DEFAULT true,
    "customer_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    CONSTRAINT "subscriptions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "membership_plans" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "billing_cycles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "billing_date" DATETIME NOT NULL,
    "amount" DECIMAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "subscription_id" TEXT NOT NULL,
    CONSTRAINT "billing_cycles_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "renewal_notices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "notice_type" TEXT NOT NULL,
    "sent_date" DATETIME NOT NULL,
    "renewal_date" DATETIME NOT NULL,
    "subscription_id" TEXT NOT NULL,
    CONSTRAINT "renewal_notices_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "subscription_plan_changes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "change_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "from_plan_id" TEXT,
    "to_plan_id" TEXT NOT NULL,
    "prorated_amount" DECIMAL NOT NULL,
    "subscription_id" TEXT NOT NULL,
    CONSTRAINT "subscription_plan_changes_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
