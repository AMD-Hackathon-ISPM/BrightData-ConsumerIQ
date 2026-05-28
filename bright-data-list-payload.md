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

---

# Instagram Raw Payload Types

Bagian ini adalah versi 1:1 dari raw Bright Data payload yang dicontohkan. Ini bukan normalized dashboard schema. Tujuannya supaya backend dan AI engineer tahu bentuk data mentah yang harus diparse.

Endpoint yang tercakup:

```txt
Instagram Profiles - Collect by URL
Instagram Reels - Collect by URL
Instagram Posts - Collect by URL
Instagram Comments - Collect by URL
```

## Instagram Profiles - Collect by URL

### Type

```ts
type InstagramProfileByUrlPayload = InstagramProfileByUrlRecord[];

type InstagramProfileByUrlRecord = {
  account: string;
  fbid: string;
  id: string;
  followers: number;
  posts_count: number;
  is_business_account: boolean;
  is_professional_account: boolean;
  is_verified: boolean;
  avg_engagement: number;
  external_url: string[] | null;
  biography: string | null;
  business_category_name: string | null;
  category_name: string | null;
  post_hashtags: string[] | null;
  following: number;
  posts: InstagramProfilePost[];
  profile_image_link: string | null;
  profile_url: string;
  profile_name: string;
  highlights_count: number;
  highlights: InstagramProfileHighlight[];
  full_name: string;
  is_private: boolean;
  bio_hashtags: string[] | null;
  url: string;
  is_joined_recently: boolean;
  has_channel: boolean;
  partner_id: string;
  business_address: string | null;
  related_accounts: InstagramRelatedAccount[];
  email_address: string | null;
  external_url_title: InstagramExternalUrlTitle | null;
  pronouns: string;
};

type InstagramProfilePost = {
  caption: string | null;
  comments: number | null;
  content_type: string;
  datetime: string;
  id: string;
  image_url: string | null;
  is_pinned: boolean;
  likes: number | null;
  location: string | null;
  post_hashtags: string[] | null;
  url: string;
  video_url: string | null;
};

type InstagramProfileHighlight = {
  highlight_url: string;
  id: string;
  image: string | null;
  owner: string;
  title: string | null;
};

type InstagramRelatedAccount = Record<string, unknown>;

type InstagramExternalUrlTitle = {
  title: string | null;
  url: string | null;
};
```

### Payload Pattern

```json
[
  {
    "account": "string",
    "fbid": "string",
    "id": "string",
    "followers": "number",
    "posts_count": "number",
    "is_business_account": "boolean",
    "is_professional_account": "boolean",
    "is_verified": "boolean",
    "avg_engagement": "number",
    "external_url": ["string"] | null,
    "biography": "string | null",
    "business_category_name": "string | null",
    "category_name": "string | null",
    "post_hashtags": ["string"] | null,
    "following": "number",
    "posts": [
      {
        "caption": "string | null",
        "comments": "number | null",
        "content_type": "string",
        "datetime": "string",
        "id": "string",
        "image_url": "string | null",
        "is_pinned": "boolean",
        "likes": "number | null",
        "location": "string | null",
        "post_hashtags": ["string"] | null,
        "url": "string",
        "video_url": "string | null"
      }
    ],
    "profile_image_link": "string | null",
    "profile_url": "string",
    "profile_name": "string",
    "highlights_count": "number",
    "highlights": [
      {
        "highlight_url": "string",
        "id": "string",
        "image": "string | null",
        "owner": "string",
        "title": "string | null"
      }
    ],
    "full_name": "string",
    "is_private": "boolean",
    "bio_hashtags": ["string"] | null,
    "url": "string",
    "is_joined_recently": "boolean",
    "has_channel": "boolean",
    "partner_id": "string",
    "business_address": "string | null",
    "related_accounts": ["object"],
    "email_address": "string | null",
    "external_url_title": {
      "title": "string | null",
      "url": "string | null"
    } | null,
    "pronouns": "string"
  }
]
```

## Instagram Reels - Collect by URL

### Type

```ts
type InstagramReelsByUrlPayload = InstagramReelByUrlRecord[];

type InstagramReelByUrlRecord = {
  url: string;
  user_posted: string;
  description: string | null;
  hashtags: string[] | null;
  num_comments: number;
  date_posted: string;
  likes: number;
  views: number | null;
  video_play_count: number | null;
  top_comments: InstagramTopComment[];
  post_id: string;
  thumbnail: string | null;
  shortcode: string;
  content_id: string;
  product_type: string | null;
  coauthor_producers: InstagramCoauthorProducer[];
  tagged_users: InstagramTaggedUser[];
  length: string | null;
  video_url: string | null;
  audio_url: string | null;
  posts_count: number;
  followers: number;
  following: number | null;
  user_profile_url: string;
  is_paid_partnership: boolean;
  is_verified: boolean;
  profile_image_link: string | null;
};

type InstagramTopComment = {
  avatar: string | null;
  comment: string;
  date_of_comment: string;
  likes: number | null;
  num_replies: number;
  replies: InstagramCommentReply[];
  user_commenting: string;
};

type InstagramCommentReply = Record<string, unknown>;
type InstagramCoauthorProducer = Record<string, unknown>;
type InstagramTaggedUser = Record<string, unknown>;
```

### Payload Pattern

```json
[
  {
    "url": "string",
    "user_posted": "string",
    "description": "string | null",
    "hashtags": ["string"] | null,
    "num_comments": "number",
    "date_posted": "string",
    "likes": "number",
    "views": "number | null",
    "video_play_count": "number | null",
    "top_comments": [
      {
        "avatar": "string | null",
        "comment": "string",
        "date_of_comment": "string",
        "likes": "number | null",
        "num_replies": "number",
        "replies": ["object"],
        "user_commenting": "string"
      }
    ],
    "post_id": "string",
    "thumbnail": "string | null",
    "shortcode": "string",
    "content_id": "string",
    "product_type": "string | null",
    "coauthor_producers": ["object"],
    "tagged_users": ["object"],
    "length": "string | null",
    "video_url": "string | null",
    "audio_url": "string | null",
    "posts_count": "number",
    "followers": "number",
    "following": "number | null",
    "user_profile_url": "string",
    "is_paid_partnership": "boolean",
    "is_verified": "boolean",
    "profile_image_link": "string | null"
  }
]
```

## Instagram Posts - Collect by URL

### Type

```ts
type InstagramPostsByUrlPayload = InstagramPostByUrlRecord[];

type InstagramPostByUrlRecord = {
  url: string;
  user_posted: string;
  description: string | null;
  hashtags: string[] | null;
  num_comments: number;
  date_posted: string;
  likes: number;
  photos: string[] | null;
  videos: string[] | null;
  location: string | null;
  location_details: InstagramLocationDetails | null;
  latest_comments: InstagramLatestComment[] | null;
  post_id: string;
  discovery_input: unknown | null;
  has_handshake: boolean | null;
  shortcode: string;
  content_type: string;
  pk: string;
  content_id: string;
  engagement_score_view: number | null;
  thumbnail: string | null;
  video_view_count: number | null;
  product_type: string | null;
  coauthor_producers: InstagramCoauthorProducer[] | null;
  tagged_users: InstagramPostTaggedUser[] | null;
  video_play_count: number | null;
  followers: number;
  posts_count: number;
  profile_image_link: string | null;
  is_verified: boolean;
  is_paid_partnership: boolean;
  partnership_details: InstagramPartnershipDetails | null;
  user_posted_id: string;
  post_content: InstagramPostContentItem[];
  audio: InstagramPostAudio | null;
  profile_url: string;
  videos_duration: number | string | null;
  images: InstagramPostImage[];
  alt_text: string | null;
  photos_number: number;
  audio_url: string | null;
};

type InstagramLocationDetails = {
  profile_pic_url: string | null;
};

type InstagramLatestComment = Record<string, unknown>;

type InstagramPostTaggedUser = {
  id: string;
  is_verified: boolean;
  profile_pic_url: string | null;
  username: string;
};

type InstagramPartnershipDetails = {
  profile_id: string | null;
  profile_url: string | null;
  username: string | null;
};

type InstagramPostContentItem = {
  alt_text: string | null;
  id: string;
  index: number;
  type: string;
  url: string;
};

type InstagramPostAudio = {
  audio_asset_id: string | null;
  ig_artist_id: string | null;
  ig_artist_username: string | null;
  original_audio_title: string | null;
};

type InstagramPostImage = {
  id: string;
  url: string;
};
```

### Payload Pattern

```json
[
  {
    "url": "string",
    "user_posted": "string",
    "description": "string | null",
    "hashtags": ["string"] | null,
    "num_comments": "number",
    "date_posted": "string",
    "likes": "number",
    "photos": ["string"] | null,
    "videos": ["string"] | null,
    "location": "string | null",
    "location_details": {
      "profile_pic_url": "string | null"
    } | null,
    "latest_comments": ["object"] | null,
    "post_id": "string",
    "discovery_input": "unknown | null",
    "has_handshake": "boolean | null",
    "shortcode": "string",
    "content_type": "string",
    "pk": "string",
    "content_id": "string",
    "engagement_score_view": "number | null",
    "thumbnail": "string | null",
    "video_view_count": "number | null",
    "product_type": "string | null",
    "coauthor_producers": ["object"] | null,
    "tagged_users": [
      {
        "id": "string",
        "is_verified": "boolean",
        "profile_pic_url": "string | null",
        "username": "string"
      }
    ] | null,
    "video_play_count": "number | null",
    "followers": "number",
    "posts_count": "number",
    "profile_image_link": "string | null",
    "is_verified": "boolean",
    "is_paid_partnership": "boolean",
    "partnership_details": {
      "profile_id": "string | null",
      "profile_url": "string | null",
      "username": "string | null"
    } | null,
    "user_posted_id": "string",
    "post_content": [
      {
        "alt_text": "string | null",
        "id": "string",
        "index": "number",
        "type": "string",
        "url": "string"
      }
    ],
    "audio": {
      "audio_asset_id": "string | null",
      "ig_artist_id": "string | null",
      "ig_artist_username": "string | null",
      "original_audio_title": "string | null"
    } | null,
    "profile_url": "string",
    "videos_duration": "number | string | null",
    "images": [
      {
        "id": "string",
        "url": "string"
      }
    ],
    "alt_text": "string | null",
    "photos_number": "number",
    "audio_url": "string | null"
  }
]
```

## Instagram Comments - Collect by URL

### Type

```ts
type InstagramCommentsByUrlPayload = InstagramCommentByUrlRecord[];

type InstagramCommentByUrlRecord = {
  url: string;
  comment_user: string;
  comment_user_url: string;
  comment_date: string;
  comment: string;
  likes_number: number;
  replies_number: number;
  replies: InstagramCommentReply[] | null;
  hashtag_comment: string[] | null;
  tagged_users_in_comment: InstagramTaggedUserInComment[] | null;
  post_url: string;
  post_user: string;
  comment_id: string;
  post_id: string;
};

type InstagramTaggedUserInComment = Record<string, unknown>;
```

### Payload Pattern

```json
[
  {
    "url": "string",
    "comment_user": "string",
    "comment_user_url": "string",
    "comment_date": "string",
    "comment": "string",
    "likes_number": "number",
    "replies_number": "number",
    "replies": ["object"] | null,
    "hashtag_comment": ["string"] | null,
    "tagged_users_in_comment": ["object"] | null,
    "post_url": "string",
    "post_user": "string",
    "comment_id": "string",
    "post_id": "string"
  }
]
```

## Instagram Dashboard Relevance

| Endpoint | Primary Dashboard Use | Secondary Use |
|---|---|---|
| `Instagram Profiles - Collect by URL` | Competitor Mirror | Launch Compass |
| `Instagram Reels - Collect by URL` | Demand Pulse | Launch Compass |
| `Instagram Posts - Collect by URL` | Demand Pulse | Competitor Mirror |
| `Instagram Comments - Collect by URL` | Persona Decode | Advisor Intelligence |

Catatan parser:
- Treat fields exactly as raw payload first, then map to normalized data later.
- CDN/media URL fields can be stored for audit/media preview, but do not need to be shown by default.
- User identity fields from comments should be hidden from dashboard display unless needed for debugging.

---

# Reddit Raw Payload Types

Bagian ini adalah versi raw Bright Data payload untuk Reddit. Ini bukan normalized dashboard schema. Tujuannya supaya backend dan AI engineer tahu bentuk data mentah yang harus diparse sebelum masuk ke ConsumerIQ dashboard.

Endpoint yang tercakup dari contoh payload:

```txt
Reddit Posts - Collect by URL
```

## Reddit Posts - Collect by URL

### Source Label

Contoh data ini harus dilabeli sebagai:

```txt
Reddit Posts - Collect by URL
```

Alasannya:
- Input utama adalah URL Reddit post.
- Output berisi satu post, metadata subreddit, related posts, dan komentar di dalam post tersebut.
- Unit analisis utamanya adalah satu Reddit post, dengan comments sebagai consumer discussion evidence.
- Data ini cocok untuk Demand Pulse, Persona Decode, dan qualitative market validation.

## Reddit Posts - Discover by keyword

### Source Label

Contoh data discovery seperti payload yang diberikan harus dilabeli sebagai:

```txt
Reddit Posts - Discover by keyword
```

Alasannya:
- Input utama berasal dari keyword/query, bukan URL post spesifik.
- Output berupa daftar post Reddit yang ditemukan dari keyword tersebut.
- Unit analisisnya tetap satu Reddit post, tapi konteks pengambilan datanya adalah discovery/search.
- Data ini paling cocok untuk Demand Pulse karena bisa menunjukkan topik, kebutuhan, dan pertanyaan yang muncul dari keyword tertentu.

Catatan penting:
- Raw record hasil `Discover by keyword` bisa punya shape yang sama dengan `Collect by URL`, terutama jika Bright Data ikut mengembalikan comments, related posts, dan community metadata.
- Perbedaan utama ada di `endpoint_label`, `query context`, dan dashboard placement.
- Jika payload tidak membawa field `input.keyword`, backend harus menyimpan keyword dari request/job metadata.

### Type

Gunakan struktur post yang sama seperti `RedditPostByUrlRecord`, dengan tambahan query metadata dari request pipeline.

```ts
type RedditPostsDiscoverByKeywordPayload = RedditPostDiscoverByKeywordRecord[];

type RedditPostDiscoverByKeywordRecord = RedditPostByUrlRecord & {
  input?: {
    keyword?: string;
    country?: string;
  };
  discovery_input?: {
    keyword?: string;
    country?: string;
  };
};
```

### Payload Pattern

```json
[
  {
    "post_id": "string",
    "url": "string",
    "user_posted": "string",
    "title": "string",
    "description": "string | null",
    "num_comments": "number",
    "date_posted": "ISO datetime",
    "community_name": "string",
    "num_upvotes": "number",
    "photos": ["string"] | null,
    "videos": ["string"] | null,
    "tag": "string | null",
    "related_posts": ["object"],
    "comments": ["object"],
    "community_url": "string",
    "community_description": "string | null",
    "community_members_num": "number | null",
    "community_rank": {
      "community_rank_type": "string | null",
      "community_rank_value": "string | number | null"
    },
    "post_karma": "number | null",
    "bio_description": "string | null",
    "embedded_links": ["string"] | null,
    "description_markdown": "string | null",
    "subreddit_icon_image": "string | null",
    "author_icon": "string | null",
    "user_id": "string",
    "archived": "string | boolean",
    "input": {
      "keyword": "string",
      "country": "string"
    }
  }
]
```

Jika Bright Data tidak mengembalikan `input`, backend harus attach metadata sendiri:

```json
{
  "endpoint_label": "reddit_posts_discover_by_keyword",
  "requested_keyword": "skincare anti aging oily skin",
  "requested_country": "us"
}
```

### Example Input Summary

Contoh payload yang diberikan:

```txt
Endpoint label:
Reddit Posts - Discover by keyword

Discovered post:
Tascam Model 12 DAW questions

Community:
r/TascamModel_12_16_24

Post engagement:
8 upvotes
6 comments

Community size:
2,121 members
```

### Field Labeling - Keyword Discovery

| Raw Field | Label Internal | Fungsi |
|---|---|---|
| `input.keyword` / backend metadata | requested_keyword | Keyword/query discovery yang diminta |
| `input.country` / backend metadata | requested_country | Negara/region request discovery |
| `post_id` | source_post_id | ID post untuk dedup |
| `url` | source_post_url | URL post hasil discovery |
| `title` | discovered_post_title | Judul post hasil discovery |
| `description` | discovered_post_body | Body post hasil discovery |
| `description_markdown` | discovered_post_body_markdown | Body markdown jika tersedia |
| `community_name` | discovered_subreddit | Subreddit asal hasil discovery |
| `community_url` | discovered_subreddit_url | URL subreddit |
| `community_members_num` | subreddit_member_count | Ukuran komunitas sebagai reach proxy |
| `num_upvotes` | post_upvote_count | Engagement post |
| `num_comments` | post_comment_count | Kedalaman diskusi |
| `comments` | discovered_post_comments | Komentar yang ikut terbawa dalam payload |
| `related_posts` | discovery_expansion_candidates | Kandidat post/subreddit tambahan |
| `date_posted` | post_created_at | Tanggal post dibuat |

### AI Normalized Labels - Keyword Discovery

Untuk discovery result, AI/backend sebaiknya fokus ke topic clustering, search intent, dan demand signal.

Contoh normalized record:

```json
{
  "source_type": "reddit_post",
  "endpoint_label": "reddit_posts_discover_by_keyword",
  "requested_keyword": "tascam model 12 daw",
  "source_post_id": "t3_1svqi94",
  "source_post_url": "https://www.reddit.com/r/TascamModel_12_16_24/comments/1svqi94/tascam_model_12_daw_questions/",
  "subreddit": "TascamModel_12_16_24",
  "post_title": "Tascam Model 12 DAW questions",
  "consumer_question_text": "Can the Model 12 individually output all audio signals through USB C in to Logic?",
  "language": "en",
  "search_intent": "product_capability_validation",
  "intent_stage": "consideration",
  "sentiment": "neutral_help_seeking",
  "topic_cluster": "DAW compatibility",
  "demand_signals": [
    "product_capability_clarity",
    "usb_multichannel_output",
    "workflow_compatibility"
  ],
  "persona_signals": [
    "detail_oriented_user",
    "peer_validation_seeker"
  ],
  "engagement": {
    "upvotes": 8,
    "comments": 6,
    "score": 14
  },
  "dashboard_placement": [
    "demand_pulse_topic_demand",
    "persona_decode_pain_signals",
    "launch_compass_messaging_recommendation"
  ]
}
```

### Dashboard Placement - Keyword Discovery

#### Primary: Demand Pulse - Topic Demand

Ini placement paling utama.

Data yang dipakai:
- requested keyword
- `title`
- `description`
- `community_name`
- `num_upvotes`
- `num_comments`
- `comments[].comment`

Contoh UI setelah aggregation:

```txt
"DAW compatibility questions"
YY Reddit posts
High discussion depth
```

Kenapa cocok:
- Discovery by keyword menunjukkan apa yang muncul saat market mencari topik tertentu.
- Bagus untuk topic clustering dan demand validation.
- Bisa dibandingkan antar keyword.

#### Primary: Demand Pulse - Search Intent Analysis

Masukkan untuk mengklasifikasikan intent dari keyword.

Contoh mapping:

```txt
tascam model 12 daw -> product capability validation
tascam model 12 review -> consideration / review seeking
tascam model 12 vs zoom -> comparison / competitor evaluation
```

#### Secondary: Persona Decode - Need/Pain Signal

Gunakan post dan comments untuk memahami alasan user bertanya.

Contoh UI:

```txt
Persona Need:
Users need reassurance that product specs work in real workflows.
```

#### Secondary: Launch Compass - Messaging Recommendation

Gunakan discovery result untuk rekomendasi FAQ, product page, dan creator brief.

Contoh UI:

```txt
Messaging Opportunity:
Make workflow compatibility explicit in launch messaging.
```

### Backend Processing Rules - Keyword Discovery

1. Store requested keyword from job/request metadata even if payload does not contain it.
2. Deduplicate by `post_id`.
3. Group by `requested_keyword`, `community_name`, and date bucket.
4. Use `title`, `description`, `description_markdown`, and comments for topic extraction.
5. Use `num_upvotes + num_comments` as lightweight engagement score.
6. Treat `related_posts` as expansion candidates, not confirmed evidence.
7. Hide user identity fields by default.
8. Use this endpoint as aggregated Demand Pulse evidence, not as verified buyer review data.

### Type

```ts
type RedditPostsByUrlPayload = RedditPostByUrlRecord[];

type RedditPostByUrlRecord = {
  post_id: string;
  url: string;
  user_posted: string;
  title: string;
  description: string | null;
  num_comments: number;
  date_posted: string;
  community_name: string;
  num_upvotes: number;
  photos: string[] | null;
  videos: string[] | null;
  tag: string | null;
  related_posts: RedditRelatedPost[];
  comments: RedditComment[];
  community_url: string;
  community_description: string | null;
  community_members_num: number | null;
  community_rank: RedditCommunityRank;
  post_karma: number | null;
  bio_description: string | null;
  embedded_links: string[] | null;
  description_markdown: string | null;
  subreddit_icon_image: string | null;
  author_icon: string | null;
  user_id: string;
  archived: string | boolean;
};

type RedditRelatedPost = {
  community: string | null;
  community_url: string | null;
  num_comments: number | null;
  num_upvotes: string | number | null;
  thumbnail: string | null;
  title: string | null;
  url: string | null;
};

type RedditComment = {
  comment: string;
  date_of_comment: string;
  num_replies: number;
  num_upvotes: number;
  replies: RedditCommentReply[];
  url: string;
  user_commenting: string;
  user_url: string;
};

type RedditCommentReply = Record<string, unknown>;

type RedditCommunityRank = {
  community_rank_type: string | null;
  community_rank_value: string | number | null;
};
```

### Payload Pattern

```json
[
  {
    "post_id": "string",
    "url": "string",
    "user_posted": "string",
    "title": "string",
    "description": "string | null",
    "num_comments": "number",
    "date_posted": "ISO datetime",
    "community_name": "string",
    "num_upvotes": "number",
    "photos": ["string"] | null,
    "videos": ["string"] | null,
    "tag": "string | null",
    "related_posts": [
      {
        "community": "string | null",
        "community_url": "string | null",
        "num_comments": "number | null",
        "num_upvotes": "string | number | null",
        "thumbnail": "string | null",
        "title": "string | null",
        "url": "string | null"
      }
    ],
    "comments": [
      {
        "comment": "string",
        "date_of_comment": "ISO datetime",
        "num_replies": "number",
        "num_upvotes": "number",
        "replies": ["object"],
        "url": "string",
        "user_commenting": "string",
        "user_url": "string"
      }
    ],
    "community_url": "string",
    "community_description": "string | null",
    "community_members_num": "number | null",
    "community_rank": {
      "community_rank_type": "string | null",
      "community_rank_value": "string | number | null"
    },
    "post_karma": "number | null",
    "bio_description": "string | null",
    "embedded_links": ["string"] | null,
    "description_markdown": "string | null",
    "subreddit_icon_image": "string | null",
    "author_icon": "string | null",
    "user_id": "string",
    "archived": "string | boolean"
  }
]
```

### Example Input Summary

Contoh payload yang diberikan:

```txt
Endpoint label:
Reddit Posts - Collect by URL

Post:
Tascam Model 12 DAW questions

Community:
r/TascamModel_12_16_24

Post engagement:
8 upvotes
6 comments

Community size:
2,121 members
```

Catatan privacy:
- Jangan tampilkan `user_posted`, `user_id`, `author_icon`, `user_commenting`, atau `user_url` di dashboard default.
- Simpan identity fields sebagai source metadata untuk deduplication, audit, dan traceability.
- Untuk UI, cukup tampilkan source sebagai `Reddit post/comment`, subreddit, engagement, tanggal, dan evidence link.

## Field Labeling - Reddit Post

| Raw Field | Label Internal | Fungsi |
|---|---|---|
| `post_id` | source_post_id | ID post untuk dedup dan grouping |
| `url` | source_post_url | URL post Reddit |
| `user_posted` | author_display_name | PII-lite, jangan tampilkan default |
| `title` | post_title | Judul utama untuk intent/topic detection |
| `description` | post_body_text | Teks utama post untuk AI analysis |
| `description_markdown` | post_body_markdown | Body versi markdown jika tersedia |
| `num_comments` | post_comment_count | Ukuran diskusi |
| `date_posted` | post_created_at | Tanggal post dibuat |
| `community_name` | subreddit_name | Nama subreddit |
| `community_url` | subreddit_url | URL subreddit |
| `community_description` | subreddit_description | Konteks komunitas |
| `community_members_num` | subreddit_member_count | Ukuran komunitas sebagai reach proxy |
| `num_upvotes` | post_upvote_count | Engagement post |
| `photos` | post_photos | Media gambar jika tersedia |
| `videos` | post_videos | Media video jika tersedia |
| `tag` | post_flair_or_tag | Flair/tag post |
| `related_posts` | related_post_candidates | Kandidat discovery tambahan |
| `comments` | post_comments | Komentar sebagai consumer discussion evidence |
| `community_rank.community_rank_type` | subreddit_rank_type | Metadata rank komunitas |
| `community_rank.community_rank_value` | subreddit_rank_value | Nilai rank komunitas |
| `post_karma` | author_post_karma | PII-lite/author metadata, jangan tampil default |
| `bio_description` | author_bio | PII-lite/author metadata |
| `embedded_links` | embedded_links | Link eksternal dalam post |
| `subreddit_icon_image` | subreddit_icon | Media komunitas, optional |
| `author_icon` | author_avatar | PII-lite, jangan tampil default |
| `user_id` | author_source_id | PII-lite untuk dedup/source trace |
| `archived` | post_archived | Status archive post |

## Field Labeling - Reddit Comment

| Raw Field | Label Internal | Fungsi |
|---|---|---|
| `comments[].comment` | consumer_voice_text | Teks komentar untuk AI tagging |
| `comments[].date_of_comment` | comment_created_at | Tanggal komentar dibuat |
| `comments[].num_replies` | comment_reply_count | Kedalaman diskusi |
| `comments[].num_upvotes` | comment_upvote_count | Engagement komentar |
| `comments[].replies` | comment_replies | Nested replies jika tersedia |
| `comments[].url` | source_comment_url | Link evidence ke komentar |
| `comments[].user_commenting` | commenter_display_name | PII-lite, jangan tampilkan default |
| `comments[].user_url` | commenter_source_url | PII-lite untuk source trace |

## AI Normalized Labels - Reddit Post

Untuk contoh post:

```txt
Tascam Model 12 DAW questions
```

Rekomendasi label AI:

| Label | Value | Alasan |
|---|---|---|
| `source_type` | `reddit_post` | Data berasal dari Reddit post |
| `endpoint_label` | `reddit_posts_collect_by_url` | Sesuai endpoint Bright Data |
| `language` | `en` | Bahasa Inggris |
| `intent_stage` | `consideration` | User sedang validasi kemampuan produk sebelum/selama penggunaan |
| `sentiment` | `neutral_help_seeking` | Post berupa pertanyaan teknis |
| `behavior_signal` | `peer_validation_before_decision` | User mencari jawaban dari komunitas |
| `demand_signal` | `product_capability_clarity` | Ada kebutuhan memahami fitur produk |
| `persona_signal` | `detail_oriented_user` | User membutuhkan detail teknis sebelum yakin |
| `product_signal` | `usb_multichannel_output` | Fitur produk yang dibahas |
| `confidence` | `medium` | Sinyal jelas, tapi domain spesifik audio gear |

Contoh normalized record:

```json
{
  "source_type": "reddit_post",
  "endpoint_label": "reddit_posts_collect_by_url",
  "source_post_id": "t3_1svqi94",
  "source_post_url": "https://www.reddit.com/r/TascamModel_12_16_24/comments/1svqi94/tascam_model_12_daw_questions/",
  "subreddit": "TascamModel_12_16_24",
  "post_title": "Tascam Model 12 DAW questions",
  "consumer_question_text": "Can the Model 12 individually output all audio signals through USB C in to Logic?",
  "language": "en",
  "sentiment": "neutral_help_seeking",
  "intent_stage": "consideration",
  "behavior_signals": [
    "peer_validation_before_decision",
    "technical_due_diligence"
  ],
  "demand_signals": [
    "product_capability_clarity",
    "usb_multichannel_output"
  ],
  "product_signals": [
    "individual_channel_routing",
    "daw_compatibility",
    "logic_workflow"
  ],
  "engagement": {
    "upvotes": 8,
    "comments": 6,
    "score": 14
  },
  "community": {
    "name": "TascamModel_12_16_24",
    "members": 2121,
    "url": "https://www.reddit.com/r/TascamModel_12_16_24/"
  },
  "source_links": {
    "post_url": "https://www.reddit.com/r/TascamModel_12_16_24/comments/1svqi94/tascam_model_12_daw_questions/"
  }
}
```

## AI Normalized Labels - Reddit Comments

Komentar dalam contoh ini berisi jawaban teknis yang mengonfirmasi fitur produk. AI/backend sebaiknya menandai komentar sebagai evidence, bukan sebagai profile user.

Contoh normalized comment:

```json
{
  "source_type": "reddit_comment",
  "endpoint_label": "reddit_posts_collect_by_url",
  "source_post_id": "t3_1svqi94",
  "source_comment_url": "https://www.reddit.com/r/TascamModel_12_16_24/comments/1svqi94/comment/oidf50f/",
  "consumer_voice_text": "Yes! Usually in the specs this is described as USB input/output or recording/playback channels. The Model 12 exposes 12 input channels (+2 for the stereo mix) and 10 output channels over USB.",
  "language": "en",
  "sentiment": "positive_confirming",
  "intent_stage": "consideration_support",
  "behavior_signals": [
    "peer_answer",
    "spec_clarification"
  ],
  "demand_signals": [
    "multichannel_usb_io",
    "feature_validation"
  ],
  "engagement": {
    "upvotes": 4,
    "replies": 0,
    "score": 4
  }
}
```

## Dashboard Placement - Reddit Posts

### Primary: Demand Pulse - Topic Demand

Taruh sebagai evidence untuk topic demand setelah aggregation.

Data yang dipakai:
- `title`
- `description`
- `description_markdown`
- `community_name`
- `num_upvotes`
- `num_comments`
- `comments[].comment`

Contoh UI setelah aggregation:

```txt
"Product capability clarity"
YY discussions
High comment depth
```

Kenapa cocok:
- Reddit post memberi sinyal pertanyaan pasar yang organik.
- Title/body menunjukkan apa yang user bingungkan atau cari.
- Jumlah comments dan upvotes memberi bobot demand.

### Primary: Persona Decode - Pain/Need Signals

Taruh sebagai evidence untuk user need dan persona reasoning.

Rekomendasi UI:

```txt
Need:
Users want peer confirmation before trusting product specs.

Evidence:
"Can the Model 12 individually output all audio signals through USB C in to Logic?"
Reddit post - 8 upvotes - 6 comments
```

Kenapa cocok:
- Reddit bagus untuk intent, concern, dan user reasoning.
- Komentar memberi konteks kenapa pertanyaan itu penting.
- Jangan tampilkan username sebagai persona identity.

### Secondary: Competitor Mirror - Product Mention Context

Masukkan kalau post atau related posts menyebut brand/produk kompetitor.

Contoh UI:

```txt
Product Mention Signal:
Tascam Model 12 appears in technical workflow discussions.
```

Kenapa secondary:
- Reddit bukan price/marketplace source utama.
- Cocok untuk mention dan perception, bukan pricing benchmark.

### Secondary: Launch Compass - Messaging Recommendation

Masukkan sebagai bahan rekomendasi messaging.

Contoh UI:

```txt
Messaging Opportunity:
Clarify product capability in simple, practical workflow language.

Supporting Signal:
Reddit users ask whether the device can route individual channels into DAW software.
```

Kenapa cocok:
- Pertanyaan Reddit bisa menjadi copywriting angle.
- Bagus untuk FAQ, product page messaging, creator script, dan sales enablement.

### Aggregated Only: Demand Pulse - Trend Charts

Jangan ubah satu post menjadi angka tren besar.

Gunakan setelah banyak Reddit posts/comments dikumpulkan:

```txt
"DAW compatibility"
+X%
YY mentions
Medium confidence
```

Kenapa aggregated:
- Satu post hanya qualitative evidence.
- Trend chart butuh banyak post/comment dari keyword/subreddit berbeda.

## Backend Processing Rules - Reddit

1. Deduplicate by `post_id`.
2. Deduplicate comments by `comments[].url` jika comment id eksplisit tidak tersedia.
3. Store raw post separately from normalized AI labels.
4. Redact or hide `user_posted`, `user_id`, `user_commenting`, dan `user_url` in dashboard output.
5. Use `title`, `description`, `description_markdown`, dan `comments[].comment` as NLP/LLM input.
6. Use `num_upvotes + num_comments` as lightweight post engagement score.
7. Use `comments[].num_upvotes + comments[].num_replies` as lightweight comment engagement score.
8. Treat `related_posts` as discovery candidates, not direct evidence unless separately collected.
9. Group by `community_name`, keyword, product/topic, and date bucket.
10. Do not convert one Reddit post into a hard market metric; aggregate before showing in Demand Pulse.
11. Reddit comments can support Persona Decode, but should not be treated as verified buyer reviews.
12. Keep source links for audit and evidence drill-down.

## Recommended Data Contract - Reddit Post

```ts
type RedditPostSignal = {
  sourceType: "reddit_post";
  endpointLabel: "reddit_posts_collect_by_url";
  post: {
    id: string;
    url: string;
    title: string;
    body: string | null;
    createdAt: string;
    archived: boolean;
  };
  community: {
    name: string;
    url: string;
    description?: string | null;
    members?: number | null;
  };
  engagement: {
    upvotes: number;
    comments: number;
    score: number;
    tier: "high" | "medium" | "low";
  };
  contentSignals: {
    topics: string[];
    productMentions: string[];
    competitorMentions: string[];
    painSignals: string[];
    intentStage:
      | "awareness"
      | "consideration"
      | "purchase_intent"
      | "post_purchase"
      | "support";
  };
  comments: RedditCommentSignal[];
  dashboardPlacement: Array<
    | "demand_pulse_topic_demand"
    | "persona_decode_pain_signals"
    | "competitor_mirror_product_mentions"
    | "launch_compass_messaging_recommendation"
  >;
};

type RedditCommentSignal = {
  sourceType: "reddit_comment";
  text: string;
  createdAt: string;
  engagement: {
    upvotes: number;
    replies: number;
    score: number;
  };
  source: {
    url: string;
  };
  labels: {
    sentiment: "positive" | "neutral" | "negative" | "mixed";
    behaviorSignals: string[];
    demandSignals: string[];
  };
};
```

## Reddit Comments - Collect by URL

### Source Label

Contoh data ini harus dilabeli sebagai:

```txt
Reddit Comments - Collect by URL
```

Alasannya:
- Input utama adalah URL Reddit post/comment.
- Output berisi satu komentar Reddit sebagai unit analisis utama.
- Payload tetap membawa konteks post, subreddit/community, reply thread, dan moderation/status metadata.
- Data ini paling cocok untuk Persona Decode karena berisi bahasa langsung dari user.

### Type

```ts
type RedditCommentsByUrlPayload = RedditCommentByUrlRecord[];

type RedditCommentByUrlRecord = {
  url: string;
  comment_id: string;
  user_posted: string;
  comment: string;
  date_posted: string;
  post_url: string;
  post_id: string;
  community_name: string;
  community_url: string;
  community_description: string | null;
  community_members_num: string | number | null;
  community_rank: RedditCommunityRank;
  replies: RedditCommentByUrlReply[];
  num_upvotes: number;
  num_replies: number;
  days_back: number;
  is_moderator: boolean;
  is_pinned: boolean;
  has_bot_in_username: boolean;
  is_locked: boolean;
  is_admin_post: boolean;
  is_archived_post: boolean;
  is_moderator_post: boolean;
  is_quarantined_post: boolean;
  is_not_safe_for_work_post: boolean;
  is_eligible_for_content_blocking_post: boolean;
  is_promoted_post: boolean;
  post_language: string | null;
  post_state: string | null;
  post_type: string | null;
  images: string[] | null;
  parent_comment_id: string;
  root_comment_id: string;
  videos: string[] | null;
};

type RedditCommentByUrlReply = {
  date_of_reply: string;
  num_replies: number | null;
  num_upvotes: number;
  reply: string;
  reply_id: string;
  reply_images: string[] | null;
  user_replying: string;
  user_url: string;
};
```

### Payload Pattern

```json
[
  {
    "url": "string",
    "comment_id": "string",
    "user_posted": "string",
    "comment": "string",
    "date_posted": "ISO datetime",
    "post_url": "string",
    "post_id": "string",
    "community_name": "string",
    "community_url": "string",
    "community_description": "string | null",
    "community_members_num": "string | number | null",
    "community_rank": {
      "community_rank_type": "string | null",
      "community_rank_value": "string | number | null"
    },
    "replies": [
      {
        "date_of_reply": "ISO datetime",
        "num_replies": "number | null",
        "num_upvotes": "number",
        "reply": "string",
        "reply_id": "string",
        "reply_images": ["string"] | null,
        "user_replying": "string",
        "user_url": "string"
      }
    ],
    "num_upvotes": "number",
    "num_replies": "number",
    "days_back": "number",
    "is_moderator": "boolean",
    "is_pinned": "boolean",
    "has_bot_in_username": "boolean",
    "is_locked": "boolean",
    "is_admin_post": "boolean",
    "is_archived_post": "boolean",
    "is_moderator_post": "boolean",
    "is_quarantined_post": "boolean",
    "is_not_safe_for_work_post": "boolean",
    "is_eligible_for_content_blocking_post": "boolean",
    "is_promoted_post": "boolean",
    "post_language": "string | null",
    "post_state": "string | null",
    "post_type": "string | null",
    "images": ["string"] | null,
    "parent_comment_id": "string",
    "root_comment_id": "string",
    "videos": ["string"] | null
  }
]
```

### Field Labeling - Reddit Comments Collect by URL

| Raw Field | Label Internal | Fungsi |
|---|---|---|
| `url` | source_comment_url | URL komentar Reddit |
| `comment_id` | source_comment_id | ID komentar untuk dedup |
| `user_posted` | commenter_display_name | PII-lite, jangan tampilkan default |
| `comment` | consumer_voice_text | Teks komentar utama untuk AI tagging |
| `date_posted` | comment_created_at | Tanggal komentar dibuat |
| `post_url` | source_post_url | URL post asal komentar |
| `post_id` | source_post_id | ID post asal untuk grouping |
| `community_name` | subreddit_name | Nama subreddit |
| `community_url` | subreddit_url | URL komunitas/subreddit |
| `community_description` | subreddit_description | Konteks komunitas |
| `community_members_num` | subreddit_member_count | Ukuran komunitas sebagai reach proxy |
| `community_rank` | subreddit_rank | Metadata rank komunitas |
| `replies` | comment_replies | Reply thread dari komentar |
| `num_upvotes` | comment_upvote_count | Engagement komentar |
| `num_replies` | comment_reply_count | Kedalaman diskusi |
| `days_back` | requested_lookback_days | Rentang waktu request |
| `post_language` | post_language | Bahasa post/konteks |
| `post_type` | post_type | Jenis post asal |
| `images` | comment_or_post_images | Media gambar jika tersedia |
| `videos` | comment_or_post_videos | Media video jika tersedia |
| `parent_comment_id` | parent_comment_id | Parent thread ID |
| `root_comment_id` | root_comment_id | Root thread ID |
| `is_moderator` / `is_pinned` / `is_locked` | moderation_flags | Status moderation/comment visibility |
| `is_admin_post` / `is_archived_post` / `is_promoted_post` | post_status_flags | Status post asal |

### AI Normalized Labels - Reddit Comments Collect by URL

Contoh normalized comment:

```json
{
  "source_type": "reddit_comment",
  "endpoint_label": "reddit_comments_collect_by_url",
  "source_comment_id": "onedrd6",
  "source_comment_url": "https://www.reddit.com/r/JEEAdv26dailyupdates/comments/1tlaimn/i_fucking_hate_scstobc_reservation/onedrd6/",
  "source_post_id": "1tlaimn",
  "source_post_url": "https://www.reddit.com/r/JEEAdv26dailyupdates/comments/1tlaimn/i_fucking_hate_scstobc_reservation/",
  "subreddit": "JEEAdv26dailyupdates",
  "consumer_voice_text": "bhai ek baat batau reservation me bhi jiske jyada marks hote hn usey hi seat milti hn...",
  "language": "en_or_mixed",
  "sentiment": "mixed",
  "intent_stage": "discussion_or_opinion",
  "behavior_signals": [
    "peer_argumentation",
    "community_debate"
  ],
  "demand_signals": [
    "topic_polarization",
    "high_context_discussion"
  ],
  "engagement": {
    "upvotes": 2,
    "replies": 1,
    "score": 3
  },
  "moderation": {
    "is_moderator": false,
    "is_pinned": false,
    "is_locked": false
  }
}
```

### Dashboard Placement - Reddit Comments Collect by URL

#### Primary: Persona Decode - Consumer Language

Gunakan komentar sebagai evidence bahasa asli user.

Contoh UI:

```txt
User language signal:
Users explain opinions through peer debate and personal reasoning.

Evidence:
Reddit comment - 2 upvotes - 1 reply
```

#### Primary: Persona Decode - Advisor Intelligence

Gunakan untuk membaca objection, reasoning, fear, trust issue, dan vocabulary user.

Contoh UI:

```txt
Advisor note:
Messaging should address the underlying belief or objection directly, not only repeat product claims.
```

#### Secondary: Demand Pulse - Aggregated Discussion Themes

Masukkan hanya setelah banyak komentar dikumpulkan dan di-cluster.

Contoh aggregate:

```txt
"Fairness / access debate"
YY comments
High reply intensity
```

### Backend Processing Rules - Reddit Comments Collect by URL

1. Deduplicate by `comment_id`.
2. Group by `post_id`, `community_name`, and topic/keyword.
3. Store raw comment separately from normalized AI labels.
4. Redact or hide `user_posted`, `replies[].user_replying`, and `replies[].user_url` in dashboard output.
5. Use `comment` and `replies[].reply` as primary NLP/LLM input.
6. Use `num_upvotes + num_replies` as lightweight comment engagement score.
7. Use moderation/status flags to filter risky or low-confidence content.
8. Treat comment text as qualitative consumer evidence, not verified buyer review.
9. Do not convert one comment into a hard market metric; aggregate before showing Demand Pulse.
10. Preserve `url` and `post_url` as source evidence links.

## Reddit Dashboard Relevance

| Endpoint | Primary Dashboard Use | Secondary Use |
|---|---|---|
| `Reddit Posts - Discover by keyword` | Demand Pulse | Persona Decode |
| `Reddit Posts - Collect by URL` | Persona Decode | Demand Pulse |
| `Reddit Comments - Collect by URL` | Persona Decode | Advisor Intelligence |
| `Reddit Posts - Discover by subreddit url` | Demand Pulse | Competitor Mirror |
| `Reddit Profiles - Collect by URL` | Not priority | Source audit only |

Catatan parser:
- Treat Reddit post/comment text as qualitative market evidence.
- Use comments for consumer language, objections, and reasoning.
- Use subreddit metadata as community context, not demographic truth.
- Hide user identity fields by default.
- Related posts are discovery hints, not confirmed evidence unless collected separately.
