# Stratey & Explanation

## 🗄️ Database Architecture (ConsumerIQ)

ConsumerIQ is built for a 5-day hackathon sprint, meaning our database schema prioritizes speed, AI compatibility, and UI flexibility. We use **PostgreSQL 16** supercharged with the `pgvector` extension. 

The architecture is divided into three hyper-optimized tables: two for storing raw Web Scraper data (Layer 2), and one for serving unified AI insights to the Next.js frontend (Layer 3).

### 1. `products` (Layer 2: Raw Market Data)
This table acts as the landing zone for the structured data we pull using Bright Data's Web Scraper APIs (e.g., from Shopee, Amazon, or TikTok Shop). 
* **Purpose:** To maintain a directory of competitors, their pricing, and their estimated market share.
* **Key Columns:**
  * `sourceId`: The original ID from the e-commerce platform (prevents duplicate scraping).
  * `price` & `salesVolume`: The critical alternative data inputs fed into our AI **Pricing Engine** to calculate market velocity and optimal price tiers.
  * `category`: Groups products together (e.g., 'Hydrating Serums') so the AI can analyze the market at a macro level.

### 2. `reviews` (Layer 2: The Vector Knowledge Base)
This table stores the raw voice of the customer. It is heavily optimized for AI similarity search.
* **Purpose:** To feed our **Persona Miner** and **Gap Analyzer** LLM prompts with exact customer pain points and feature requests.
* **The Magic Column (`embedding vector(384)`):** Instead of relying on expensive OpenAI APIs, we process every review locally using the `all-MiniLM-L6-v2` model. This column stores the resulting 384-dimensional vector. 
* **Performance:** We utilize an `hnsw` (Hierarchical Navigable Small World) index on this vector column. When the LLM needs to find the top 50 reviews complaining about "chemical burns" or "high prices," Postgres returns the vectors in milliseconds, even on a CPU.

### 3. `categoryInsights` (Layer 3: The Command Center)
This is the most powerful table in the application. It acts as the absolute single source of truth for the frontend dashboard.
* **Purpose:** To eliminate complex SQL joins and API bottlenecks. The frontend only ever queries this one table.
* **The JSONB Cheat Code:** Because our `Llama-3.2-3B-Instruct` model can unpredictably find new types of market gaps, we do not use rigid relational columns. Instead, the AI output is dumped directly into three `JSONB` columns (`gtmIntelligence`, `financeIntelligence`, `securityCompliance`). If we change our AI prompt to extract new data, the database requires zero schema migrations.
* **Async Task Tracking (`status` column):** Because local LLM inference takes 10-30 seconds, this table tracks the Celery worker state. The frontend polls this column to display a loading spinner (`processing`) until the Llama-3 synthesis is complete (`completed`), keeping the UI responsive.