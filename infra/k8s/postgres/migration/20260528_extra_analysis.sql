ALTER TABLE categoryInsights
ADD COLUMN IF NOT EXISTS extraAnalysis JSONB;
