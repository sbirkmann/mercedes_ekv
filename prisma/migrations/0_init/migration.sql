-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "customerNumber" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "passwordHash" TEXT,
    "street" TEXT,
    "zip" TEXT,
    "city" TEXT,
    "country" TEXT NOT NULL DEFAULT 'DE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscountGroup" (
    "code" CHAR(3) NOT NULL,
    "name" TEXT,
    "percent" DECIMAL(5,2),
    "individual" BOOLEAN NOT NULL DEFAULT false,
    "minMargin" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscountGroup_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "partNumber" TEXT NOT NULL,
    "partNumberFmt" TEXT NOT NULL,
    "titleDe" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "listPrice" DECIMAL(12,2) NOT NULL,
    "discountGroupCode" CHAR(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerDiscount" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "discountGroupCode" CHAR(3) NOT NULL,
    "discount" DECIMAL(5,2),
    "individual" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_customerNumber_key" ON "Customer"("customerNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Article_partNumber_key" ON "Article"("partNumber");

-- CreateIndex
CREATE INDEX "Article_discountGroupCode_idx" ON "Article"("discountGroupCode");

-- CreateIndex
CREATE INDEX "CustomerDiscount_customerId_idx" ON "CustomerDiscount"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerDiscount_customerId_discountGroupCode_key" ON "CustomerDiscount"("customerId", "discountGroupCode");

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_discountGroupCode_fkey" FOREIGN KEY ("discountGroupCode") REFERENCES "DiscountGroup"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerDiscount" ADD CONSTRAINT "CustomerDiscount_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerDiscount" ADD CONSTRAINT "CustomerDiscount_discountGroupCode_fkey" FOREIGN KEY ("discountGroupCode") REFERENCES "DiscountGroup"("code") ON DELETE CASCADE ON UPDATE CASCADE;

