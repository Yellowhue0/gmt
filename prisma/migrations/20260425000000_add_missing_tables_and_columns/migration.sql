-- Add missing enum values to Role
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'PARENT';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'JUNIOR';

-- Create ClassType enum
DO $$ BEGIN
  CREATE TYPE "ClassType" AS ENUM ('REGULAR', 'SPECIAL', 'FIGHTERS_ONLY', 'KIDS_ONLY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add missing columns to User
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "isConfirmed"       BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "confirmedAt"        TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "confirmedBy"        TEXT,
  ADD COLUMN IF NOT EXISTS "isLocked"          BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "lockedReason"      TEXT,
  ADD COLUMN IF NOT EXISTS "lockedAt"          TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lockedBy"          TEXT,
  ADD COLUMN IF NOT EXISTS "fighterCardNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "fighterCardExpiry" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "weightClass"       TEXT,
  ADD COLUMN IF NOT EXISTS "currentWeight"     DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "wins"              INTEGER      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "losses"            INTEGER      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "draws"             INTEGER      NOT NULL DEFAULT 0;

-- Add missing columns to GymSession
ALTER TABLE "GymSession"
  ADD COLUMN IF NOT EXISTS "classType"     "ClassType"  NOT NULL DEFAULT 'REGULAR',
  ADD COLUMN IF NOT EXISTS "visibility"    TEXT         NOT NULL DEFAULT 'PUBLIC',
  ADD COLUMN IF NOT EXISTS "isRecurring"   BOOLEAN      NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "specificDate"  TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "seriesId"      TEXT;

-- Create SessionAssignedTrainer
CREATE TABLE IF NOT EXISTS "SessionAssignedTrainer" (
    "sessionId"  TEXT NOT NULL,
    "userId"     TEXT NOT NULL,
    "assignedBy" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionAssignedTrainer_pkey" PRIMARY KEY ("sessionId", "userId")
);

ALTER TABLE "SessionAssignedTrainer"
  DROP CONSTRAINT IF EXISTS "SessionAssignedTrainer_sessionId_fkey";
ALTER TABLE "SessionAssignedTrainer"
  ADD CONSTRAINT "SessionAssignedTrainer_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "GymSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SessionAssignedTrainer"
  DROP CONSTRAINT IF EXISTS "SessionAssignedTrainer_userId_fkey";
ALTER TABLE "SessionAssignedTrainer"
  ADD CONSTRAINT "SessionAssignedTrainer_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create ChildMember
CREATE TABLE IF NOT EXISTS "ChildMember" (
    "id"              TEXT         NOT NULL,
    "firstName"       TEXT         NOT NULL,
    "lastName"        TEXT         NOT NULL,
    "dateOfBirth"     TIMESTAMP(3) NOT NULL,
    "parentId"        TEXT         NOT NULL,
    "isConfirmed"     BOOLEAN      NOT NULL DEFAULT false,
    "membershipPaid"  BOOLEAN      NOT NULL DEFAULT false,
    "membershipStart" TIMESTAMP(3),
    "membershipEnd"   TIMESTAMP(3),
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChildMember_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ChildMember"
  DROP CONSTRAINT IF EXISTS "ChildMember_parentId_fkey";
ALTER TABLE "ChildMember"
  ADD CONSTRAINT "ChildMember_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create ChildCheckIn
CREATE TABLE IF NOT EXISTS "ChildCheckIn" (
    "id"        TEXT         NOT NULL,
    "childId"   TEXT         NOT NULL,
    "sessionId" TEXT         NOT NULL,
    "date"      TEXT         NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChildCheckIn_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ChildCheckIn_childId_sessionId_date_key"
  ON "ChildCheckIn"("childId", "sessionId", "date");

ALTER TABLE "ChildCheckIn"
  DROP CONSTRAINT IF EXISTS "ChildCheckIn_childId_fkey";
ALTER TABLE "ChildCheckIn"
  ADD CONSTRAINT "ChildCheckIn_childId_fkey"
  FOREIGN KEY ("childId") REFERENCES "ChildMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChildCheckIn"
  DROP CONSTRAINT IF EXISTS "ChildCheckIn_sessionId_fkey";
ALTER TABLE "ChildCheckIn"
  ADD CONSTRAINT "ChildCheckIn_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "GymSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create FighterCompetitionEntry
CREATE TABLE IF NOT EXISTS "FighterCompetitionEntry" (
    "id"            TEXT         NOT NULL,
    "fighterId"     TEXT         NOT NULL,
    "eventId"       TEXT         NOT NULL,
    "weightAtEntry" DOUBLE PRECISION,
    "opponent"      TEXT,
    "result"        TEXT,
    "notes"         TEXT,
    "enteredBy"     TEXT         NOT NULL,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FighterCompetitionEntry_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "FighterCompetitionEntry"
  DROP CONSTRAINT IF EXISTS "FighterCompetitionEntry_fighterId_fkey";
ALTER TABLE "FighterCompetitionEntry"
  ADD CONSTRAINT "FighterCompetitionEntry_fighterId_fkey"
  FOREIGN KEY ("fighterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FighterCompetitionEntry"
  DROP CONSTRAINT IF EXISTS "FighterCompetitionEntry_eventId_fkey";
ALTER TABLE "FighterCompetitionEntry"
  ADD CONSTRAINT "FighterCompetitionEntry_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
