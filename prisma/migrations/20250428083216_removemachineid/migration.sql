-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER', 'HEAD_PHARMACIST', 'PHARMACIST', 'ASSISTANT', 'SUPER');

-- CreateTable
CREATE TABLE "Drugs" (
    "id" VARCHAR(100) NOT NULL,
    "Drugcode" VARCHAR(20) NOT NULL,
    "DrugName" VARCHAR(255) NOT NULL,
    "DrugStatus" BOOLEAN NOT NULL DEFAULT false,
    "DrugImage" VARCHAR(255),
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Drugs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Orders" (
    "id" VARCHAR(200) NOT NULL,
    "PrescriptionId" VARCHAR(200) NOT NULL,
    "OrderItemId" VARCHAR(200) NOT NULL,
    "OrderItemName" VARCHAR(200) NOT NULL,
    "OrderQty" INTEGER NOT NULL,
    "OrderUnitcode" VARCHAR(20) NOT NULL,
    "Machine" VARCHAR(200) NOT NULL,
    "Command" VARCHAR(200) NOT NULL,
    "OrderStatus" CHAR(1) NOT NULL DEFAULT '0',
    "Slot" VARCHAR(2),
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prescription" (
    "id" VARCHAR(200) NOT NULL,
    "PrescriptionDate" VARCHAR(200) NOT NULL,
    "Hn" VARCHAR(20) NOT NULL,
    "An" VARCHAR(20) NOT NULL,
    "PatientName" VARCHAR(200) NOT NULL,
    "WardCode" VARCHAR(20) NOT NULL,
    "WardDesc" VARCHAR(200) NOT NULL,
    "PriorityCode" VARCHAR(20) NOT NULL,
    "PriorityDesc" VARCHAR(200) NOT NULL,
    "PresStatus" CHAR(1) NOT NULL DEFAULT '0',
    "UsedByUserId" TEXT NOT NULL,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Machines" (
    "id" VARCHAR(100) NOT NULL,
    "MachineName" VARCHAR(200) NOT NULL,
    "MachineStatus" CHAR(1) NOT NULL,
    "MachineSlot1" BOOLEAN NOT NULL DEFAULT false,
    "MachineSlot2" BOOLEAN NOT NULL DEFAULT false,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Machines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inventory" (
    "id" VARCHAR(100) NOT NULL,
    "InventoryPosition" INTEGER NOT NULL,
    "InventoryQty" INTEGER NOT NULL DEFAULT 0,
    "Min" INTEGER NOT NULL DEFAULT 0,
    "Max" INTEGER NOT NULL DEFAULT 0,
    "InventoryStatus" BOOLEAN NOT NULL DEFAULT false,
    "DrugId" VARCHAR(100) NOT NULL,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Users" (
    "id" VARCHAR(100) NOT NULL,
    "UserName" VARCHAR(155) NOT NULL,
    "UserPassword" VARCHAR(155) NOT NULL,
    "UserPincode" VARCHAR(155) NOT NULL,
    "DisplayName" VARCHAR(150) NOT NULL,
    "UserImage" VARCHAR(255),
    "UserStatus" BOOLEAN NOT NULL DEFAULT true,
    "UserRole" "Role" NOT NULL DEFAULT 'USER',
    "CreateBy" VARCHAR(100) NOT NULL,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Inventory_DrugId_key" ON "Inventory"("DrugId");

-- CreateIndex
CREATE UNIQUE INDEX "Users_UserName_key" ON "Users"("UserName");

-- AddForeignKey
ALTER TABLE "Orders" ADD CONSTRAINT "Orders_OrderItemId_fkey" FOREIGN KEY ("OrderItemId") REFERENCES "Drugs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orders" ADD CONSTRAINT "Orders_PrescriptionId_fkey" FOREIGN KEY ("PrescriptionId") REFERENCES "Prescription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_UsedByUserId_fkey" FOREIGN KEY ("UsedByUserId") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_DrugId_fkey" FOREIGN KEY ("DrugId") REFERENCES "Drugs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
