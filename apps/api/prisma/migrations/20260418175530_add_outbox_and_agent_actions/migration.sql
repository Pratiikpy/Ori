-- CreateTable
CREATE TABLE "domain_events" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "domain_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_actions" (
    "id" TEXT NOT NULL,
    "ownerAddr" TEXT NOT NULL,
    "agentAddr" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "argsJson" TEXT NOT NULL,
    "promptHash" TEXT,
    "txHash" TEXT,
    "resultJson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMsg" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "agent_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "domain_events_publishedAt_createdAt_idx" ON "domain_events"("publishedAt", "createdAt");

-- CreateIndex
CREATE INDEX "domain_events_topic_createdAt_idx" ON "domain_events"("topic", "createdAt");

-- CreateIndex
CREATE INDEX "agent_actions_ownerAddr_createdAt_idx" ON "agent_actions"("ownerAddr", "createdAt");

-- CreateIndex
CREATE INDEX "agent_actions_agentAddr_createdAt_idx" ON "agent_actions"("agentAddr", "createdAt");

-- CreateIndex
CREATE INDEX "agent_actions_promptHash_idx" ON "agent_actions"("promptHash");

-- CreateIndex
CREATE INDEX "agent_actions_txHash_idx" ON "agent_actions"("txHash");
