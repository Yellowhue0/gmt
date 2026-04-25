CREATE TABLE IF NOT EXISTS "Registration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Registration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Registration_userId_sessionId_date_key" ON "Registration"("userId", "sessionId", "date");

ALTER TABLE "Registration" DROP CONSTRAINT IF EXISTS "Registration_userId_fkey";
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Registration" DROP CONSTRAINT IF EXISTS "Registration_sessionId_fkey";
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GymSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
