-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "initiaAddress" TEXT NOT NULL,
    "hexAddress" TEXT NOT NULL,
    "initName" TEXT,
    "encryptionPubkey" BYTEA,
    "onboardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "ipHash" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "ciphertext" BYTEA NOT NULL,
    "senderCiphertext" BYTEA,
    "senderSignature" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dhKey" TEXT NOT NULL,
    "authKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_links" (
    "id" TEXT NOT NULL,
    "shortCode" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "secretHashHex" TEXT NOT NULL,
    "onChainGiftId" TEXT,
    "amount" BIGINT NOT NULL,
    "denom" TEXT NOT NULL,
    "theme" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT NOT NULL DEFAULT '',
    "claimed" BOOLEAN NOT NULL DEFAULT false,
    "claimedByAddress" TEXT,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_cache" (
    "address" TEXT NOT NULL,
    "initName" TEXT,
    "bio" TEXT NOT NULL DEFAULT '',
    "avatarUrl" TEXT NOT NULL DEFAULT '',
    "linksJson" JSONB NOT NULL DEFAULT '[]',
    "hideBalance" BOOLEAN NOT NULL DEFAULT false,
    "hideActivity" BOOLEAN NOT NULL DEFAULT false,
    "whitelistOnly" BOOLEAN NOT NULL DEFAULT false,
    "cachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_cache_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "event_cursors" (
    "listenerName" TEXT NOT NULL,
    "lastHeight" BIGINT NOT NULL,
    "lastTxHash" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_cursors_pkey" PRIMARY KEY ("listenerName")
);

-- CreateTable
CREATE TABLE "follows" (
    "id" TEXT NOT NULL,
    "fromAddr" TEXT NOT NULL,
    "toAddr" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tip_events" (
    "id" TEXT NOT NULL,
    "tipperAddr" TEXT NOT NULL,
    "creatorAddr" TEXT NOT NULL,
    "grossAmount" BIGINT NOT NULL,
    "netAmount" BIGINT NOT NULL,
    "feeAmount" BIGINT NOT NULL,
    "denom" TEXT NOT NULL,
    "message" TEXT NOT NULL DEFAULT '',
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tip_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_events" (
    "id" TEXT NOT NULL,
    "fromAddr" TEXT NOT NULL,
    "toAddr" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "denom" TEXT NOT NULL,
    "memo" TEXT NOT NULL DEFAULT '',
    "chatId" TEXT NOT NULL DEFAULT '',
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_stats" (
    "address" TEXT NOT NULL,
    "paymentsSent" INTEGER NOT NULL DEFAULT 0,
    "paymentsReceived" INTEGER NOT NULL DEFAULT 0,
    "tipsGiven" INTEGER NOT NULL DEFAULT 0,
    "tipsReceived" INTEGER NOT NULL DEFAULT 0,
    "tipsGivenVolume" BIGINT NOT NULL DEFAULT 0,
    "tipsReceivedVolume" BIGINT NOT NULL DEFAULT 0,
    "giftsSent" INTEGER NOT NULL DEFAULT 0,
    "giftsClaimed" INTEGER NOT NULL DEFAULT 0,
    "wagersWon" INTEGER NOT NULL DEFAULT 0,
    "billsSplit" INTEGER NOT NULL DEFAULT 0,
    "referrals" INTEGER NOT NULL DEFAULT 0,
    "followersCount" INTEGER NOT NULL DEFAULT 0,
    "followingCount" INTEGER NOT NULL DEFAULT 0,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_stats_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "quest_completions" (
    "id" TEXT NOT NULL,
    "userAddress" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quest_completions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_initiaAddress_key" ON "users"("initiaAddress");

-- CreateIndex
CREATE UNIQUE INDEX "users_hexAddress_key" ON "users"("hexAddress");

-- CreateIndex
CREATE UNIQUE INDEX "users_initName_key" ON "users"("initName");

-- CreateIndex
CREATE INDEX "users_initName_idx" ON "users"("initName");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_token_key" ON "auth_sessions"("token");

-- CreateIndex
CREATE INDEX "auth_sessions_token_idx" ON "auth_sessions"("token");

-- CreateIndex
CREATE INDEX "auth_sessions_userId_idx" ON "auth_sessions"("userId");

-- CreateIndex
CREATE INDEX "auth_sessions_expiresAt_idx" ON "auth_sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "messages_chatId_createdAt_idx" ON "messages"("chatId", "createdAt");

-- CreateIndex
CREATE INDEX "messages_recipientId_createdAt_idx" ON "messages"("recipientId", "createdAt");

-- CreateIndex
CREATE INDEX "messages_expiresAt_idx" ON "messages"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_userId_idx" ON "push_subscriptions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_links_shortCode_key" ON "payment_links"("shortCode");

-- CreateIndex
CREATE INDEX "payment_links_shortCode_idx" ON "payment_links"("shortCode");

-- CreateIndex
CREATE INDEX "payment_links_creatorId_idx" ON "payment_links"("creatorId");

-- CreateIndex
CREATE INDEX "payment_links_expiresAt_idx" ON "payment_links"("expiresAt");

-- CreateIndex
CREATE INDEX "profile_cache_initName_idx" ON "profile_cache"("initName");

-- CreateIndex
CREATE INDEX "follows_fromAddr_createdAt_idx" ON "follows"("fromAddr", "createdAt");

-- CreateIndex
CREATE INDEX "follows_toAddr_createdAt_idx" ON "follows"("toAddr", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "follows_fromAddr_toAddr_key" ON "follows"("fromAddr", "toAddr");

-- CreateIndex
CREATE INDEX "tip_events_creatorAddr_createdAt_idx" ON "tip_events"("creatorAddr", "createdAt");

-- CreateIndex
CREATE INDEX "tip_events_tipperAddr_createdAt_idx" ON "tip_events"("tipperAddr", "createdAt");

-- CreateIndex
CREATE INDEX "tip_events_creatorAddr_grossAmount_idx" ON "tip_events"("creatorAddr", "grossAmount");

-- CreateIndex
CREATE INDEX "payment_events_fromAddr_createdAt_idx" ON "payment_events"("fromAddr", "createdAt");

-- CreateIndex
CREATE INDEX "payment_events_toAddr_createdAt_idx" ON "payment_events"("toAddr", "createdAt");

-- CreateIndex
CREATE INDEX "user_stats_tipsReceivedVolume_idx" ON "user_stats"("tipsReceivedVolume");

-- CreateIndex
CREATE INDEX "user_stats_paymentsSent_idx" ON "user_stats"("paymentsSent");

-- CreateIndex
CREATE INDEX "user_stats_lastActiveAt_idx" ON "user_stats"("lastActiveAt");

-- CreateIndex
CREATE INDEX "quest_completions_userAddress_idx" ON "quest_completions"("userAddress");

-- CreateIndex
CREATE UNIQUE INDEX "quest_completions_userAddress_questId_key" ON "quest_completions"("userAddress", "questId");

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_links" ADD CONSTRAINT "payment_links_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
