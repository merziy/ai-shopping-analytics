-- CreateTable
CREATE TABLE "VisitorSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "referrer" TEXT,
    "aiPlatform" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "landingPage" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PageEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "page" TEXT,
    "productId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PageEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "VisitorSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AttributedOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "shopifyOrderId" TEXT NOT NULL,
    "orderTotal" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "sessionId" TEXT,
    "aiPlatform" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AttributedOrder_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "VisitorSession" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "VisitorSession_token_key" ON "VisitorSession"("token");

-- CreateIndex
CREATE UNIQUE INDEX "AttributedOrder_sessionId_key" ON "AttributedOrder"("sessionId");
