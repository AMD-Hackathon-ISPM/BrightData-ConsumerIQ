## Bright Data marketplace and social integration

Integrasi scraping marketplace dan social media sekarang lewat Bright Data Web Scraper API, bukan ScrapingBee. ScrapingBee masih bisa ada untuk jalur Google SERP lama, tetapi endpoint marketplace/social di backend sudah diarahkan ke Bright Data.

### 1. Schema layer

Schema response ada di `backend/brightdata/schemas.py`.

File ini berfungsi sebagai kontrak data untuk hasil Bright Data sebelum dikirim ke worker, agent, atau frontend. Registry schema bisa dicek dari:

```
GET /api/brightdata/schemas
```

Schema yang sudah masuk:

- Marketplace: Tokopedia, Alibaba, Sephora, Lazada, Amazon, Walmart.
- Social media: Instagram profiles/posts/reels/comments, TikTok profiles/posts/comments/search/TikTok Shop, X profiles/posts.
- Error payload: `brightdata.error`, dipakai saat Bright Data mengembalikan record error dengan `include_errors=true`.

Validasi schema dilakukan best-effort. Kalau Bright Data mengembalikan `snapshot_id`, response belum berupa list record final, sehingga status validasinya akan ditandai pending sampai snapshot di-download.

### 2. Endpoint registry

Registry endpoint ada di `backend/brightdata/endpoints.py`.

Setiap item registry menjelaskan cara backend memanggil dataset Bright Data:

- `key`: nama endpoint internal, misalnya `tiktok.posts.discover_keyword`.
- `datasetKey`: schema yang dipakai untuk validasi, misalnya `tiktok.posts`.
- `datasetId`: Bright Data dataset id default.
- `type` dan `discoverBy`: query parameter Bright Data untuk discovery endpoint.
- `requiredFields`: field yang wajib ada di tiap input.
- `optionalFields` dan `defaultInput`: field opsional dan default payload.

Daftar endpoint yang aktif bisa dicek dari:

```
GET /api/brightdata/endpoints
```

Endpoint penting yang sudah terdaftar:

- Tokopedia products: collect URL, discover keyword, discover seller URL, discover category/store URL.
- Amazon products: collect URL, best sellers URL, category URL, keyword, UPC, reviews, seller info, global product dataset, product search dataset.
- Walmart products: collect URL, keyword, category URL, SKU, search URL, zipcode-aware product, seller info.
- Lazada products/reviews, Alibaba products, Sephora products.
- Instagram profiles/posts/reels/comments.
- TikTok profiles/posts/comments/search/profile posts/discover pages/TikTok Shop products.
- X profiles/posts/profile timeline discovery.

### 3. Bright Data API routes

FastAPI router ada di `backend/api/brightdataScrape.py`, dengan prefix `/api/brightdata`.

Endpoint langsung:

```
GET  /api/brightdata/endpoints
GET  /api/brightdata/schemas
POST /api/brightdata/scrape
POST /api/brightdata/scrape/{endpoint_key}
GET  /api/brightdata/snapshots/{snapshot_id}/progress
POST /api/brightdata/snapshots/{snapshot_id}/download
```

Contoh request yang benar dari Swagger untuk TikTok keyword discovery:

```json
{
  "endpoint": "tiktok.posts.discover_keyword",
  "input": [
    {
      "search_keyword": "#reviewskincare",
      "country": "ID"
    }
  ],
  "notify": false,
  "include_errors": true,
  "timeout_seconds": 120
}
```

Atau pakai path endpoint:

```
POST /api/brightdata/scrape/tiktok.posts.discover_keyword
```

Dengan body:

```json
{
  "input": [
    {
      "search_keyword": "#reviewskincare",
      "country": "ID"
    }
  ],
  "notify": false,
  "include_errors": true,
  "timeout_seconds": 120
}
```

Jangan isi field Swagger placeholder seperti `"endpoint": "string"`, `"dataset_id": "string"`, `"type": "string"`, atau `"discover_by": "string"`. Kalau memakai endpoint registry, backend otomatis mengisi `dataset_id`, `type`, dan `discover_by`.

### 4. Snapshot flow

Beberapa dataset Bright Data tidak langsung mengembalikan record final. Kalau response berisi `snapshotId`, berarti job masih diproses oleh Bright Data.

Langkahnya:

```
GET /api/brightdata/snapshots/{snapshot_id}/progress
```

Kalau status Bright Data sudah ready, download hasilnya:

```
POST /api/brightdata/snapshots/{snapshot_id}/download
```

Body download:

```json
{
  "dataset_key": "tiktok.posts",
  "format": "json",
  "timeout_seconds": 120
}
```

`dataset_key` dipakai supaya hasil download snapshot tetap divalidasi ke schema yang benar.

### 5. Legacy marketplace/social routes

Route lama tetap ada agar worker, agent, dan frontend tidak perlu langsung berubah:

```
POST /api/marketplace-scrape
POST /api/marketplace-batch-scrape
POST /api/marketplace-discovery
POST /api/social-scrape
POST /api/social-discovery
```

Bedanya, implementasi route tersebut sekarang memanggil Bright Data client (`backend/brightdata/client.py`) dan endpoint registry, bukan scraping marketplace/social via ScrapingBee.

### 6. Environment

Untuk local dev, isi token di:

```
backend/.env
```

Minimal:

```
BRIGHTDATA_API_TOKEN=your_brightdata_token
```

Backend juga masih mengenali alias `BRIGHT_DATA_API_TOKEN` dan `BRIGHTDATA_TOKEN`, tetapi nama utama yang dipakai project ini adalah `BRIGHTDATA_API_TOKEN`.

Saat menjalankan local API:

```
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

Buka Swagger:

```
http://127.0.0.1:8000/docs
```

`GET /` memang bisa `404 Not Found`; itu normal karena API root page belum dibuat. Pakai `/docs`, `/api/brightdata/endpoints`, atau route API lain.
