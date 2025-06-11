-- AlterTable
ALTER TABLE "Orders" ALTER COLUMN "OrderStatus" SET DEFAULT 'ready',
ALTER COLUMN "OrderStatus" SET DATA TYPE VARCHAR(100);

-- AlterTable
ALTER TABLE "Prescription" ALTER COLUMN "PresStatus" SET DEFAULT 'ready',
ALTER COLUMN "PresStatus" SET DATA TYPE VARCHAR(100);
