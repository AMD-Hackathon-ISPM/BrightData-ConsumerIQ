CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    sourceId VARCHAR(255) UNIQUE, -- The original ID from Shopee/Amazon
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- e.g., 'Hydrating Serums', 'Gen Z Skincare'
    brand VARCHAR(100),
    price DECIMAL(10, 2),
    salesVolume INT, -- Penting buat Pricing & Trend Engine
    scrapedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP);

CREATE TABLE marketSignals (
    id SERIAL PRIMARY KEY,
    productId INT REFERENCES products(id) ON DELETE CASCADE, --Can be NULL if the threat is a brand-wide PR disaster or FDA news
    signalText TEXT NOT NULL,
    sourceType VARCHAR(50) NOT NULL, --('review', 'tiktok', 'fda_news', 'pdf')
    sourceUrl TEXT,
    sentimentScore DECIMAL(3, 2), -- Generic score (-1.0 to 1.0) replaces 1-5 stars so it works for news/social too
    signalDate DATE DEFAULT CURRENT_DATE,
    embedding vector(384));

CREATE INDEX ON marketSignals USING hnsw (embedding vector_cosine_ops);

CREATE TABLE categoryInsights (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'processing', --'processing', 'completed', 'failed'
    lastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    gtmIntelligence JSONB,       
    financeIntelligence JSONB,   
    securityCompliance JSONB);

CREATE TABLE founderProfiles (
    id SERIAL PRIMARY KEY,
    workspaceName VARCHAR(255) NOT NULL,
    launchType VARCHAR(50) NOT NULL, -- 'physical', 'digital', 'service'
    launchCategory VARCHAR(100) NOT NULL,
    targetRegion VARCHAR(100),
    targetCountry VARCHAR(100),
    targetDemographics JSONB,
    salesChannel VARCHAR(50), -- 'offline', 'online', 'omnichannel'
    problemsToSolve TEXT,
    productName VARCHAR(255),
    productDescription TEXT,
    uniqueSellingPoint TEXT,
    keyFeatures TEXT,
    competitiveAdvantage TEXT,
    priceMin DECIMAL(10, 2),
    pricePrimary DECIMAL(10, 2),
    priceMax DECIMAL(10, 2),
    researchGoals JSONB,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP);

CREATE TABLE searchIntent (
    id SERIAL PRIMARY KEY,
    keyword VARCHAR(255) NOT NULL,
    region VARCHAR(100),
    country VARCHAR(100),
    intentType VARCHAR(50), -- 'informational', 'transactional', etc.
    volume INT,
    growthRate DECIMAL(6, 2),
    intentDate DATE DEFAULT CURRENT_DATE);

CREATE INDEX ON searchIntent (keyword);

CREATE TABLE salesMetrics (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    region VARCHAR(100),
    country VARCHAR(100),
    revenue DECIMAL(14, 2),
    unitsSold INT,
    growthRate DECIMAL(6, 2),
    metricDate DATE DEFAULT CURRENT_DATE);

CREATE INDEX ON salesMetrics (category);

CREATE TABLE competitors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    region VARCHAR(100),
    country VARCHAR(100),
    priceMin DECIMAL(10, 2),
    priceMax DECIMAL(10, 2),
    strengths JSONB,
    weaknesses JSONB,
    sources JSONB,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP);

CREATE INDEX ON competitors (category);

CREATE TABLE trendVelocity (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    region VARCHAR(100),
    country VARCHAR(100),
    velocityScore DECIMAL(8, 2),
    velocityDate DATE DEFAULT CURRENT_DATE);

CREATE INDEX ON trendVelocity (category);

CREATE TABLE insightRuns (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    founderProfileId INT REFERENCES founderProfiles(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'processing',
    inputs JSONB,
    outputs JSONB,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP);

CREATE TABLE founderForms (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    payload JSONB NOT NULL);