-- AlterTable
ALTER TABLE "GymSession" ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledBy" TEXT,
ADD COLUMN     "isCancelled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "SessionConfirmedTrainer" (
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "SessionConfirmedTrainer_pkey" PRIMARY KEY ("sessionId","userId")
);

-- AddForeignKey
ALTER TABLE "SessionConfirmedTrainer" ADD CONSTRAINT "SessionConfirmedTrainer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GymSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionConfirmedTrainer" ADD CONSTRAINT "SessionConfirmedTrainer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
