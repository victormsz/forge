-- CreateEnum
CREATE TYPE "EquipmentSlot" AS ENUM ('MAIN_HAND', 'OFF_HAND', 'ARMOR', 'SHIELD');

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "equippedSlot" "EquipmentSlot";
