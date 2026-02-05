/*
  Warnings:

  - You are about to drop the column `isGuest` on the `User` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('guest', 'player', 'dm');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "isGuest",
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'player';
