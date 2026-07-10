-- DropForeignKey
ALTER TABLE "Article" DROP CONSTRAINT "Article_discountGroupCode_fkey";

-- DropForeignKey
ALTER TABLE "CustomerDiscount" DROP CONSTRAINT "CustomerDiscount_discountGroupCode_fkey";

-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "height" INTEGER,
ADD COLUMN     "length" INTEGER,
ADD COLUMN     "weight" INTEGER,
ADD COLUMN     "width" INTEGER,
ALTER COLUMN "discountGroupCode" SET DATA TYPE VARCHAR(10);

-- AlterTable
ALTER TABLE "CustomerDiscount" ALTER COLUMN "discountGroupCode" SET DATA TYPE VARCHAR(10);

-- AlterTable
ALTER TABLE "DiscountGroup" DROP CONSTRAINT "DiscountGroup_pkey",
ALTER COLUMN "code" SET DATA TYPE VARCHAR(10),
ADD CONSTRAINT "DiscountGroup_pkey" PRIMARY KEY ("code");

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_discountGroupCode_fkey" FOREIGN KEY ("discountGroupCode") REFERENCES "DiscountGroup"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerDiscount" ADD CONSTRAINT "CustomerDiscount_discountGroupCode_fkey" FOREIGN KEY ("discountGroupCode") REFERENCES "DiscountGroup"("code") ON DELETE CASCADE ON UPDATE CASCADE;

