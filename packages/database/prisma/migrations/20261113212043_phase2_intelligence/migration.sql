-- AlterTable
ALTER TABLE "agent_runs" ADD COLUMN     "findings" JSONB,
ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "agent_tasks" ADD COLUMN     "assignedMember" TEXT,
ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'IMPROVEMENT',
ADD COLUMN     "estimatedComplexity" TEXT NOT NULL DEFAULT 'M',
ADD COLUMN     "evidence" TEXT,
ADD COLUMN     "expectedBenefit" TEXT,
ADD COLUMN     "moduleName" TEXT,
ADD COLUMN     "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "relevantFiles" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "requiredTests" TEXT,
ADD COLUMN     "suggestedApproach" TEXT;

-- AlterTable
ALTER TABLE "repositories" ADD COLUMN     "lastAnalyzedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "agent_tasks_priority_idx" ON "agent_tasks"("priority");
