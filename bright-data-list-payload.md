# TikTok Comment Labeling Guide

Dokumen ini dipakai untuk menyamakan bahasa antara AI engineer, backend engineer, dan dashboard/UI ketika membaca output dari Bright Data TikTok endpoint.

## Source Label

Contoh data ini harus dilabeli sebagai:

```txt
TikTok Comments - Collect by URL
```

Alasannya:
- Input utama adalah `url` video TikTok.
- Output berisi data komentar dari post tersebut.
- Unit analisisnya adalah satu komentar, bukan satu post, profile, atau produk TikTok Shop.

## Example Input

```json
{
  "url": "https://www.tiktok.com/@fluffyaa_/video/7535851013937384760?q=skincare%20review%20indonesia&t=1779694828328",
  "post_url": "https://www.tiktok.com/@fluffyaa_/video/7535851013937384760?q=skincare%20review%20indonesia&t=1779694828328",
  "post_id": "7535851013937384760",
  "post_date_created": "2025-08-07T14:30:46.000Z",
  "date_created": "2025-08-28T09:51:38.000Z",
  "comment_text": "aku udh abis satu set",
  "num_likes": 3,
  "num_replies": 4,
  "commenter_user_name": "redacted_user",
  "commenter_id": "7405513582714618886",
  "commenter_url": "https://www.tiktok.com/@ifa83910",
  "comment_id": "7543571864086496018",
  "comment_url": "https://www.tiktok.com/@fluffyaa_/video/7535851013937384760?comment_id=7543571864086496018",
  "replies": null,
  "timestamp": "2026-05-25T07:49:48.824Z",
  "input": {
    "url": "https://www.tiktok.com/@fluffyaa_/video/7535851013937384760?q=skincare%20review%20indonesia&t=1779694828328"
  }
}
```

Catatan privacy:
- Jangan tampilkan `commenter_user_name`, `commenter_id`, atau `commenter_url` di dashboard publik/internal non-debug.
- Simpan sebagai source metadata untuk deduplication, audit, dan traceability.
- Untuk UI, cukup tampilkan source sebagai `TikTok comment`, engagement, tanggal, dan link comment/post.

## Field Labeling

| Raw Field | Label Internal | Fungsi |
|---|---|---|
| `url` | input_post_url | URL video yang dikirim ke endpoint |
| `post_url` | source_post_url | URL post asal komentar |
| `post_id` | source_post_id | ID post untuk dedup dan grouping |
| `post_date_created` | post_created_at | Tanggal post dibuat |
| `date_created` | comment_created_at | Tanggal komentar dibuat |
| `comment_text` | consumer_voice_text | Teks utama untuk AI analysis |
| `num_likes` | comment_like_count | Engagement komentar |
| `num_replies` | comment_reply_count | Kedalaman diskusi |
| `commenter_user_name` | commenter_display_name | PII-lite, jangan tampilkan default |
| `commenter_id` | commenter_source_id | PII-lite untuk dedup/source trace |
| `commenter_url` | commenter_source_url | PII-lite untuk source trace |
| `comment_id` | source_comment_id | ID komentar untuk dedup |
| `comment_url` | source_comment_url | Link evidence ke komentar |
| `replies` | comment_replies | Thread replies jika tersedia |
| `timestamp` | scraped_at | Waktu data diambil |
| `input.url` | requested_post_url | URL yang diminta user/backend |

## AI Normalized Labels

Untuk contoh komentar:

```txt
aku udh abis satu set
```

Rekomendasi label AI:

| Label | Value | Alasan |
|---|---|---|
| `source_type` | `tiktok_comment` | Data berasal dari komentar TikTok |
| `endpoint_label` | `tiktok_comments_collect_by_url` | Sesuai endpoint Bright Data |
| `language` | `id` | Bahasa Indonesia informal |
| `sentiment` | `positive_or_satisfied` | User menyatakan sudah menghabiskan satu set |
| `intent_stage` | `post_purchase` | Komentar muncul setelah pengalaman pemakaian |
| `behavior_signal` | `routine_completion` | User menyelesaikan satu set skincare |
| `demand_signal` | `bundle_interest` | Ada sinyal produk set/bundle diminati |
| `persona_signal` | `committed_routine_user` | User terlihat committed terhadap rutinitas skincare |
| `product_signal` | `full_set_usage` | Relevan untuk produk bundle/set |
| `confidence` | `medium` | Sinyal jelas, tapi hanya satu komentar |

Contoh normalized record:

```json
{
  "source_type": "tiktok_comment",
  "endpoint_label": "tiktok_comments_collect_by_url",
  "source_post_id": "7535851013937384760",
  "source_comment_id": "7543571864086496018",
  "consumer_voice_text": "aku udh abis satu set",
  "language": "id",
  "sentiment": "positive_or_satisfied",
  "intent_stage": "post_purchase",
  "behavior_signals": [
    "routine_completion",
    "committed_routine_user"
  ],
  "demand_signals": [
    "bundle_interest",
    "full_set_usage"
  ],
  "engagement": {
    "likes": 3,
    "replies": 4,
    "score": 7
  },
  "source_links": {
    "post_url": "https://www.tiktok.com/@fluffyaa_/video/7535851013937384760?q=skincare%20review%20indonesia&t=1779694828328",
    "comment_url": "https://www.tiktok.com/@fluffyaa_/video/7535851013937384760?comment_id=7543571864086496018"
  }
}
```

## Dashboard Placement

### Primary: Persona Decode - User Personas

Taruh sebagai evidence untuk persona card.

Rekomendasi UI:

```txt
Behavior:
Routine finisher / committed skincare user

Motivation:
Willing to use a complete skincare set until finished.

Evidence:
"aku udh abis satu set"
TikTok comment - 3 likes - 4 replies
```

Kenapa cocok:
- Komentar ini menjelaskan perilaku konsumen, bukan performa produk secara kuantitatif.
- Sinyalnya kuat untuk memahami habit: user menyelesaikan full set.
- Bisa membantu AI membuat persona seperti `Routine Builder`, `Budget-conscious Trend Seeker`, atau `Committed Skincare User`.

### Primary: Persona Decode - Advisor Intelligence

Taruh sebagai bahan rekomendasi messaging dan positioning.

Rekomendasi UI:

```txt
Key Behavior:
Users are open to complete skincare routines, not only single-SKU trials.

Brand Message:
"Finish the full routine, see the full result."

Market Opportunity:
Bundle-based skincare sets can convert TikTok review audiences.
```

Kenapa cocok:
- Data komentar bisa dipakai AI untuk menyusun brand message.
- Cocok untuk insight berbasis bahasa asli consumer.
- Berguna untuk menentukan apakah positioning harus single product atau routine/set.

### Secondary: Launch Compass - AI Recommendation

Taruh sebagai support untuk rekomendasi launch package.

Rekomendasi UI:

```txt
Launch Recommendation:
Test starter skincare bundles instead of launching only single products.

Supporting Signal:
TikTok comments mention finishing a full set, indicating routine adoption.
```

Kenapa cocok:
- Komentar ini mendukung strategi bundling.
- Berguna untuk GTM: creator review, starter set, trial set, routine kit.
- Belum cukup untuk menentukan kota/channel, tapi bagus sebagai qualitative evidence.

### Aggregated Only: Demand Pulse - Claim Trends

Jangan tampilkan satu komentar ini langsung di Demand Pulse. Masukkan hanya setelah banyak komentar serupa terkumpul.

Jika sudah aggregated, bisa muncul sebagai:

```txt
"Full set routine"
+X%
YY mentions
Low saturation
```

Kenapa aggregated:
- Demand Pulse butuh sinyal tren, bukan single anecdote.
- `comment_text` ini bisa dihitung sebagai mention untuk cluster `bundle_interest` atau `routine_completion`.
- Jika muncul berulang di banyak post, baru layak jadi claim/demand trend.

### Aggregated Only: Demand Pulse - Price Tier Movement

Masukkan setelah dikombinasikan dengan TikTok Shop/Amazon product price data.

Contoh insight:

```txt
Signal:
Bundle interest rising in mid-tier pricing.

Explanation:
Users mention finishing complete sets, supporting mid-tier bundle packaging.
```

Kenapa butuh data lain:
- Komentar ini tidak punya harga.
- Price tier perlu product price dari TikTok Shop, Amazon, atau marketplace lain.
- Comment hanya memberi konteks bahwa format `set` masuk akal.

## Backend Processing Rules

1. Deduplicate by `comment_id`.
2. Group comments by `post_id`.
3. Store raw data separately from normalized AI labels.
4. Redact or hide commenter identity in dashboard output.
5. Use `comment_text` as primary text for NLP/LLM tagging.
6. Use `num_likes + num_replies` as a lightweight engagement score.
7. Use `comment_url` and `post_url` as evidence links.
8. Do not convert one comment into a hard metric; aggregate before showing in Demand Pulse.

## Recommended Dashboard Data Contract

```ts
type ConsumerVoiceEvidence = {
  sourceType: "tiktok_comment";
  endpointLabel: "tiktok_comments_collect_by_url";
  text: string;
  language: string;
  sentiment: "positive_or_satisfied" | "neutral" | "negative" | "mixed";
  intentStage:
    | "awareness"
    | "consideration"
    | "purchase_intent"
    | "post_purchase";
  behaviorSignals: string[];
  demandSignals: string[];
  engagement: {
    likes: number;
    replies: number;
    score: number;
  };
  source: {
    postId: string;
    commentId: string;
    postUrl: string;
    commentUrl: string;
    commentCreatedAt: string;
    scrapedAt: string;
  };
};
```

## Additional Source: TikTok Posts - Discover by Keyword

Contoh file:

```txt
D:\sd_mpkxy54h2bmrq0wdwd.json
```

Label endpoint:

```txt
TikTok Posts - Discover by keyword
```

Alasannya:
- Input utama berisi `search_keyword` dan `country`.
- Output sukses berisi daftar post/video TikTok hasil discovery dari keyword atau hashtag.
- Unit analisisnya adalah satu post, bukan satu komentar.
- Data ini cocok untuk trend, reach, engagement, creator/source discovery, dan claim detection dari caption/hashtag.

Ringkasan file:

```txt
Total records: 152
Valid post records: 149
Error records: 3
Keywords: #BrighteningSeries, #kulitcerah, #reviewskincare, #Skincareroutine
```

### Payload Pattern - Success Record

Jangan simpan seluruh payload mentah ke dashboard. Backend cukup normalize pattern seperti ini:

```json
{
  "source_type": "tiktok_post",
  "endpoint_label": "tiktok_posts_discover_by_keyword",
  "query": {
    "search_keyword": "#reviewskincare",
    "country": "ID"
  },
  "post": {
    "post_id": "string",
    "url": "string",
    "description": "string",
    "created_at": "ISO datetime",
    "post_type": "video | content",
    "region": "ID"
  },
  "engagement": {
    "likes": 0,
    "plays": 0,
    "shares": 0,
    "collects": 0,
    "comments": 0,
    "engagement_score": 0
  },
  "creator": {
    "profile_id": "string",
    "username": "string",
    "profile_url": "string",
    "followers": 0,
    "is_verified": false,
    "biography": "string"
  },
  "content_signals": {
    "hashtags": ["string"],
    "tagged_users": ["string"],
    "sound": "string",
    "video_duration": 0,
    "subtitle_languages": ["ind-ID", "eng-US"]
  },
  "media": {
    "preview_image": "string",
    "video_url": "string | null",
    "cdn_link": "string | null"
  },
  "scrape_meta": {
    "scraped_at": "ISO datetime"
  }
}
```

### Payload Pattern - Error Record

Error record jangan masuk ke insight analytics. Masukkan ke pipeline monitoring.

```json
{
  "source_type": "tiktok_post_discovery_error",
  "endpoint_label": "tiktok_posts_discover_by_keyword",
  "query": {
    "search_keyword": "#Skincareroutine",
    "country": "CN"
  },
  "error": {
    "message": "Crawler error: Navigation failed: Timeout error in network.",
    "code": "net_err_timed_out"
  },
  "scrape_meta": {
    "scraped_at": "ISO datetime"
  }
}
```

### Field Labeling - Post Discovery

| Raw Field | Label Internal | Fungsi |
|---|---|---|
| `input.search_keyword` | requested_keyword | Keyword/hashtag yang diminta |
| `discovery_input.search_keyword` | discovery_keyword | Keyword/hashtag asal hasil discovery |
| `input.country` / `discovery_input.country` | requested_country | Negara pencarian |
| `url` | source_post_url | URL post TikTok |
| `post_id` | source_post_id | ID post untuk dedup |
| `description` | post_caption_text | Caption utama untuk AI tagging |
| `create_time` | post_created_at | Tanggal post dibuat |
| `digg_count` | like_count | Jumlah likes |
| `play_count` | play_count | Jumlah views/plays |
| `share_count` / `num_share_count` | share_count | Jumlah shares, normalize ke number |
| `collect_count` | save_count | Jumlah saves/collects |
| `comment_count` | comment_count | Jumlah komentar |
| `hashtags` | hashtags | Claim/topic tags dari post |
| `profile_username` | creator_name | Nama creator, jangan jadi persona user |
| `profile_url` | creator_url | Source creator |
| `profile_followers` | creator_followers | Creator reach proxy |
| `profile_biography` | creator_bio | Creator/business context |
| `tagged_user` | tagged_accounts | Brand/shop/creator yang ditag |
| `region` | post_region | Region post |
| `subtitle_info` | subtitle_sources | Sumber transcript jika tersedia |
| `timestamp` | scraped_at | Waktu data diambil |
| `error` | crawler_error_message | Error message untuk monitoring |
| `error_code` | crawler_error_code | Error code untuk monitoring |

### AI Normalized Labels - Post Discovery

Untuk post discovery skincare, AI/backend sebaiknya menghasilkan label seperti:

```json
{
  "source_type": "tiktok_post",
  "endpoint_label": "tiktok_posts_discover_by_keyword",
  "content_category": "skincare",
  "market": "ID",
  "language": "id_or_mixed",
  "trend_signals": [
    "skincare_review",
    "brightening",
    "bodycare",
    "routine"
  ],
  "claim_signals": [
    "kulit_cerah",
    "glowing",
    "acne_care",
    "body_acne"
  ],
  "engagement_tier": "high | medium | low",
  "creator_type": "brand | creator | reseller | unknown",
  "dashboard_use": [
    "demand_pulse",
    "launch_compass",
    "competitor_mirror"
  ]
}
```

### Dashboard Placement - Post Discovery

#### Primary: Demand Pulse - Claim Trends

Ini placement paling cocok.

Data yang dipakai:
- `description`
- `hashtags`
- `play_count`
- `digg_count`
- `collect_count`
- `comment_count`
- `create_time`
- `discovery_input.search_keyword`

Contoh UI setelah aggregation:

```txt
"Kulit cerah / glowing"
+X%
YY posts
High engagement
```

Kenapa cocok:
- Caption dan hashtag bisa jadi sumber claim trend.
- Engagement memberi bobot tren.
- Keyword discovery bisa membandingkan cluster seperti `#reviewskincare`, `#kulitcerah`, dan `#BrighteningSeries`.

#### Primary: Demand Pulse - Search Intent Analysis

Masukkan sebagai social intent layer, digabung dengan SERP.

Contoh mapping:

```txt
#reviewskincare -> commercial / consideration
#kulitcerah -> problem-solution / informational
#Skincareroutine -> routine-building / consideration
#BrighteningSeries -> product/claim-led commercial
```

Kenapa cocok:
- TikTok keyword/hashtag memberi sinyal bahasa pasar.
- SERP tetap dibutuhkan untuk search volume, tapi TikTok memperkaya social demand.

#### Primary: Demand Pulse - Demand vs Supply

Data ini bagus untuk sisi demand, bukan supply.

Cara pakai:

```txt
Demand proxy:
play_count + like_count + collect_count + comment_count + share_count

Supply proxy:
jumlah unique posts / creators / tagged brands per keyword
```

Kenapa cocok:
- Banyak views/saves/comments menunjukkan minat pasar.
- Jumlah post dan creator bisa jadi proxy saturation.
- Tetap perlu marketplace product data untuk supply yang lebih keras.

#### Secondary: Launch Compass - AI Recommendation

Masukkan untuk rekomendasi channel, creator seeding, dan launch narrative.

Data yang dipakai:
- `profile_username`
- `profile_url`
- `profile_followers`
- `region`
- `description`
- `hashtags`
- `engagement`

Contoh UI:

```txt
TikTok GTM Signal:
Brightening and skincare review posts show high engagement in Indonesia.

Recommended play:
Seed creator reviews around brightening/bodycare routine narratives.
```

Kenapa cocok:
- Post discovery menunjukkan narasi apa yang sedang menarik perhatian.
- Creator/profile data bisa dipakai untuk kandidat seeding atau partner monitoring.

#### Secondary: Competitor Mirror - Content/Creator Watchlist

Masukkan kalau `tagged_user`, `profile_biography`, atau caption menyebut brand/produk.

Contoh UI:

```txt
Competitor Content Signal:
Brand/tagged creator appears in high-engagement skincare review posts.
```

Kenapa cocok:
- `tagged_user` bisa mendeteksi brand/shop yang sering muncul.
- `profile_biography` kadang menunjukkan reseller, brand, affiliate, atau creator bisnis.
- Belum cukup untuk pricing/sales; perlu TikTok Shop/Amazon product data.

#### Secondary: Persona Decode - Topic Context Only

Jangan jadikan post caption sebagai consumer pain point utama.

Cara pakai:

```txt
Persona context:
Audience is exposed to brightening, bodycare routine, acne care, and skincare review narratives.
```

Kenapa secondary:
- Caption adalah bahasa creator/brand, bukan komentar konsumen.
- Untuk pain point persona, tetap prioritaskan `TikTok Comments - Collect by URL`.

#### Infrastructure: Data Settings - Network Health

Error records masuk ke bagian infrastructure, bukan insight.

Contoh UI:

```txt
TikTok Posts Discover by keyword:
3 timeout errors
Affected country: CN
Error code: net_err_timed_out
```

Kenapa cocok:
- Error timeout penting untuk observability pipeline.
- Jangan dicampur dengan market insight.

### Backend Processing Rules - Post Discovery

1. Deduplicate by `post_id`.
2. Normalize `share_count` string ke number; gunakan `num_share_count` jika tersedia.
3. Hitung `engagement_score` dari weighted `play_count`, `digg_count`, `collect_count`, `comment_count`, dan `share_count`.
4. Extract claim/topic dari `description`, `hashtags`, dan subtitle/transcript jika tersedia.
5. Group by `discovery_keyword`, `country`, `region`, dan `created_at` bucket.
6. Pisahkan `error` records dari valid post records.
7. Jangan tampilkan `profile_avatar`, `video_url`, `cdn_link`, atau token/CDN fields kecuali memang ada kebutuhan media preview.
8. Gunakan `profile_url` dan `url` sebagai evidence/source links.
9. Untuk persona, jangan jadikan caption sebagai consumer voice tanpa komentar pendukung.

### Recommended Data Contract - Post Discovery

```ts
type TikTokPostDiscoverySignal = {
  sourceType: "tiktok_post";
  endpointLabel: "tiktok_posts_discover_by_keyword";
  query: {
    keyword: string;
    country: string;
  };
  post: {
    id: string;
    url: string;
    caption: string;
    createdAt: string;
    type: "video" | "content" | string;
    region?: string;
  };
  engagement: {
    likes: number;
    plays: number;
    shares: number;
    collects: number;
    comments: number;
    score: number;
    tier: "high" | "medium" | "low";
  };
  creator: {
    id: string;
    username: string;
    url: string;
    followers?: number;
    verified?: boolean;
    bio?: string;
  };
  contentSignals: {
    hashtags: string[];
    taggedAccounts: string[];
    claims: string[];
    topics: string[];
    subtitleLanguages: string[];
  };
  dashboardPlacement: Array<
    | "demand_pulse_claim_trends"
    | "demand_pulse_search_intent"
    | "demand_pulse_demand_vs_supply"
    | "launch_compass_ai_recommendation"
    | "competitor_mirror_content_watchlist"
  >;
};
```

## Summary

Untuk contoh ini:

```txt
Label endpoint:
TikTok Comments - Collect by URL

Primary dashboard placement:
Persona Decode - User Personas
Persona Decode - Advisor Intelligence

Secondary placement:
Launch Compass - AI Recommendation

Only after aggregation:
Demand Pulse - Claim Trends
Demand Pulse - Price Tier Movement
```

Inti insight:

```txt
Komentar ini adalah consumer voice evidence bahwa sebagian audience skincare TikTok sudah familiar dengan pemakaian full set/routine. Backend sebaiknya menandai sebagai bundle_interest, routine_completion, dan post_purchase signal. Dashboard sebaiknya menampilkannya sebagai evidence persona dan rekomendasi bundling, bukan sebagai angka demand tunggal.
```
