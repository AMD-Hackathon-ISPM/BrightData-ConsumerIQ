CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE founderForms (
    id        TEXT PRIMARY KEY,
    user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
    status    TEXT NOT NULL,
    createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    payload   JSONB NOT NULL
);

CREATE TABLE products (
    id          SERIAL PRIMARY KEY,
    sourceId    VARCHAR(255) UNIQUE,
    name        VARCHAR(255) NOT NULL,
    category    VARCHAR(100) NOT NULL,
    brand       VARCHAR(100),
    country     VARCHAR(10),
    marketplace VARCHAR(50),
    price       DECIMAL(10, 2),
    salesVolume INT,
    scrapedAt   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ON products (category, country);

CREATE TABLE marketSignals (
    id             SERIAL PRIMARY KEY,
    productId      INT REFERENCES products(id) ON DELETE SET NULL,
    signalText     TEXT NOT NULL,
    sourceType     VARCHAR(50) NOT NULL,
    sourceUrl      TEXT,
    country        VARCHAR(10),
    category       VARCHAR(100),
    sentimentScore DECIMAL(3, 2),
    signalDate     DATE DEFAULT CURRENT_DATE,
    embedding      vector(384)
);

CREATE INDEX ON marketSignals USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON marketSignals (category, country);

CREATE TABLE categoryInsights (
    id                  SERIAL PRIMARY KEY,
    category            VARCHAR(100) NOT NULL,
    country             VARCHAR(10) NOT NULL DEFAULT '',
    status              VARCHAR(50) DEFAULT 'processing',
    lastUpdated         TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    gtmIntelligence     JSONB,
    financeIntelligence JSONB,
    securityCompliance  JSONB,
    extraAnalysis       JSONB,
    UNIQUE (category, country)
);

CREATE TABLE competitors (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    category    VARCHAR(100) NOT NULL,
    country     VARCHAR(10),
    marketplace VARCHAR(50),
    priceMin    DECIMAL(10, 2),
    priceMax    DECIMAL(10, 2),
    strengths   JSONB,
    weaknesses  JSONB,
    sources     JSONB,
    updatedAt   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ON competitors (category, country);

CREATE TABLE chatHistory (
    user_id   BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    messages  JSONB NOT NULL DEFAULT '[]'::jsonb,
    updatedAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
