-- CreateEnum
CREATE TYPE "ProjectSourceType" AS ENUM ('ZIP', 'GITHUB', 'HYBRID');

-- CreateEnum
CREATE TYPE "VersionStatus" AS ENUM ('PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "TaskPriorityLevel" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "ArtifactType" AS ENUM ('PROJECT_ZIP', 'TEAM_ZIP', 'DIFF_PATCH', 'REPORT_MD', 'LOG');

-- CreateEnum
CREATE TYPE "GitHubSyncStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUCCESS', 'FAILED');

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "projectId" TEXT;

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sourceType" "ProjectSourceType" NOT NULL DEFAULT 'ZIP',
    "repositoryId" TEXT,
    "activeVersionId" TEXT,
    "storagePath" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_versions" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "status" "VersionStatus" NOT NULL DEFAULT 'PROCESSING',
    "originalZipPath" TEXT,
    "extractedPath" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "fileCount" INTEGER NOT NULL DEFAULT 0,
    "totalBytes" BIGINT NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "changelog" TEXT,
    "errorLog" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT DEFAULT '#3b82f6',
    "leadName" TEXT,
    "leadEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_modules" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "teamId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "pathPattern" TEXT NOT NULL,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "suggestedBy" TEXT DEFAULT 'AI',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "development_tasks" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "projectVersionId" TEXT,
    "moduleId" TEXT,
    "teamId" TEXT,
    "dailyExecutionId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "TaskPriorityLevel" NOT NULL DEFAULT 'MEDIUM',
    "category" TEXT NOT NULL DEFAULT 'FEATURE',
    "estimatedComplexity" TEXT NOT NULL DEFAULT 'M',
    "expectedBenefit" TEXT,
    "suggestedApproach" TEXT,
    "requiredTests" TEXT,
    "relevantFiles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "evidence" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "development_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_executions" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "projectVersionId" TEXT,
    "triggerType" "TriggerType" NOT NULL DEFAULT 'SCHEDULED',
    "status" "ExecutionStatus" NOT NULL DEFAULT 'QUEUED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "summary" TEXT,
    "errorLog" TEXT,
    "tasksCount" INTEGER NOT NULL DEFAULT 0,
    "changedFiles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "testResults" JSONB,
    "buildResults" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artifacts" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "projectVersionId" TEXT,
    "dailyExecutionId" TEXT,
    "teamId" TEXT,
    "type" "ArtifactType" NOT NULL DEFAULT 'PROJECT_ZIP',
    "name" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" BIGINT NOT NULL DEFAULT 0,
    "checksum" TEXT NOT NULL,
    "metadata" JSONB,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "github_syncs" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "dailyExecutionId" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "branchName" TEXT NOT NULL,
    "commitSha" TEXT,
    "pullRequestUrl" TEXT,
    "pullRequestNumber" INTEGER,
    "status" "GitHubSyncStatus" NOT NULL DEFAULT 'PENDING',
    "errorLog" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "github_syncs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "projects_organizationId_idx" ON "projects"("organizationId");

-- CreateIndex
CREATE INDEX "projects_repositoryId_idx" ON "projects"("repositoryId");

-- CreateIndex
CREATE UNIQUE INDEX "projects_organizationId_slug_key" ON "projects"("organizationId", "slug");

-- CreateIndex
CREATE INDEX "project_versions_projectId_idx" ON "project_versions"("projectId");

-- CreateIndex
CREATE INDEX "project_versions_status_idx" ON "project_versions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "project_versions_projectId_versionNumber_key" ON "project_versions"("projectId", "versionNumber");

-- CreateIndex
CREATE INDEX "teams_organizationId_idx" ON "teams"("organizationId");

-- CreateIndex
CREATE INDEX "teams_projectId_idx" ON "teams"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "teams_projectId_slug_key" ON "teams"("projectId", "slug");

-- CreateIndex
CREATE INDEX "project_modules_projectId_idx" ON "project_modules"("projectId");

-- CreateIndex
CREATE INDEX "project_modules_teamId_idx" ON "project_modules"("teamId");

-- CreateIndex
CREATE INDEX "development_tasks_projectId_idx" ON "development_tasks"("projectId");

-- CreateIndex
CREATE INDEX "development_tasks_status_idx" ON "development_tasks"("status");

-- CreateIndex
CREATE INDEX "development_tasks_priority_idx" ON "development_tasks"("priority");

-- CreateIndex
CREATE INDEX "development_tasks_teamId_idx" ON "development_tasks"("teamId");

-- CreateIndex
CREATE INDEX "daily_executions_projectId_idx" ON "daily_executions"("projectId");

-- CreateIndex
CREATE INDEX "daily_executions_status_idx" ON "daily_executions"("status");

-- CreateIndex
CREATE INDEX "daily_executions_createdAt_idx" ON "daily_executions"("createdAt");

-- CreateIndex
CREATE INDEX "artifacts_projectId_idx" ON "artifacts"("projectId");

-- CreateIndex
CREATE INDEX "artifacts_type_idx" ON "artifacts"("type");

-- CreateIndex
CREATE INDEX "artifacts_dailyExecutionId_idx" ON "artifacts"("dailyExecutionId");

-- CreateIndex
CREATE INDEX "artifacts_teamId_idx" ON "artifacts"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "github_syncs_dailyExecutionId_key" ON "github_syncs"("dailyExecutionId");

-- CreateIndex
CREATE INDEX "github_syncs_projectId_idx" ON "github_syncs"("projectId");

-- CreateIndex
CREATE INDEX "github_syncs_repositoryId_idx" ON "github_syncs"("repositoryId");

-- CreateIndex
CREATE INDEX "github_syncs_status_idx" ON "github_syncs"("status");

-- CreateIndex
CREATE INDEX "audit_logs_projectId_idx" ON "audit_logs"("projectId");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "repositories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_versions" ADD CONSTRAINT "project_versions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_modules" ADD CONSTRAINT "project_modules_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_modules" ADD CONSTRAINT "project_modules_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "development_tasks" ADD CONSTRAINT "development_tasks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "development_tasks" ADD CONSTRAINT "development_tasks_projectVersionId_fkey" FOREIGN KEY ("projectVersionId") REFERENCES "project_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "development_tasks" ADD CONSTRAINT "development_tasks_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "project_modules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "development_tasks" ADD CONSTRAINT "development_tasks_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "development_tasks" ADD CONSTRAINT "development_tasks_dailyExecutionId_fkey" FOREIGN KEY ("dailyExecutionId") REFERENCES "daily_executions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_executions" ADD CONSTRAINT "daily_executions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_executions" ADD CONSTRAINT "daily_executions_projectVersionId_fkey" FOREIGN KEY ("projectVersionId") REFERENCES "project_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_projectVersionId_fkey" FOREIGN KEY ("projectVersionId") REFERENCES "project_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_dailyExecutionId_fkey" FOREIGN KEY ("dailyExecutionId") REFERENCES "daily_executions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "github_syncs" ADD CONSTRAINT "github_syncs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "github_syncs" ADD CONSTRAINT "github_syncs_dailyExecutionId_fkey" FOREIGN KEY ("dailyExecutionId") REFERENCES "daily_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "github_syncs" ADD CONSTRAINT "github_syncs_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
