-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('open', 'ordered');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('open', 'partially_delivered', 'fully_delivered');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveryStatus" "DeliveryStatus" NOT NULL DEFAULT 'open',
ADD COLUMN     "status" "OrderStatus" NOT NULL DEFAULT 'open';

