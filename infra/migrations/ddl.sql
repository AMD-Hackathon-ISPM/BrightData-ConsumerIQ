CREATE EXTENSION IF NOT EXISTS vector;


CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    sourceId VARCHAR(255) UNIQUE,-- The original ID from Shopee/Amazon
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,-- e.g., 'Hydrating Serums', 'Gen Z Skincare'
    brand VARCHAR(100),
    price DECIMAL(10, 2),
    salesVolume INT,-- Penting buat Pricing & Trend Engine
    scrapedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP);

CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    productId INT REFERENCES products(id) ON DELETE CASCADE,
    reviewText TEXT NOT NULL,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    reviewDate DATE,
    embedding vector(384));

CREATE INDEX ON reviews USING hnsw (embedding vector_cosine_ops);

CREATE TABLE categoryInsights (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100) UNIQUE NOT NULL,
    lastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    gtmIntelligence JSONB,       
    financeIntelligence JSONB,   
    securityCompliance JSONB);