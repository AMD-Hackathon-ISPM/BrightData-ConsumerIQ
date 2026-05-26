from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field, RootModel


class LooseModel(BaseModel):
    model_config = ConfigDict(extra="allow")


class NameValue(LooseModel):
    name: str | None = None
    value: str | None = None


class TypeValue(LooseModel):
    type: str | None = None
    value: str | None = None


class UrlName(LooseModel):
    url: str | None = None
    name: str | None = None


class PriceAmount(LooseModel):
    currency: str | None = None
    symbol: str | None = None
    value: float | None = None


class BrightDataErrorRecord(LooseModel):
    timestamp: str | None = None
    input: dict[str, Any] = Field(default_factory=dict)
    error: str
    error_code: str
    discovery_input: dict[str, Any] | None = None


class BrightDataErrorPayload(RootModel[list[BrightDataErrorRecord]]):
    pass


class TokopediaVariation(LooseModel):
    name: str | None = None
    product_variant_id: str | None = None
    variant_id: str | None = None
    url: str | None = None
    price: float | None = None
    stock: str | int | None = None
    image: str | None = None


class TokopediaRatingBreakdown(LooseModel):
    rate: int
    count: int


class TokopediaSellerBadge(LooseModel):
    badge: str | None = None
    image: str | None = None


class TokopediaProductRecord(LooseModel):
    product_id: str
    title: str
    url: str
    currency: str
    delivery: list[str] = Field(default_factory=list)
    final_price: float | None = None
    initial_price: float | None = None
    seller_name: str | None = None
    description: str | None = None
    availability: str | int | None = None
    reviews_count: int = 0
    rating_count: int = 0
    rating: float | None = None
    discussion_count: int = 0
    categories: list[str] = Field(default_factory=list)
    images_count: int = 0
    image_urls: list[str] = Field(default_factory=list)
    videos_count: int = 0
    video_urls: list[str] = Field(default_factory=list)
    sold: str | int | None = None
    discount: str | None = None
    date_first_available: str | None = None
    seller_id: str | None = None
    seller_rating: float | None = None
    min_order: int | None = None
    max_order: int | None = None
    weight: float | None = None
    weight_unit: str | None = None
    condition: str | None = None
    view_count: int | None = None
    main_image: str | None = None
    breadcrumbs: list[UrlName] = Field(default_factory=list)
    variations: list[TokopediaVariation] | None = None
    gmv: float | None = None
    seller_image: str | None = None
    rating_breakdown: list[TokopediaRatingBreakdown] = Field(default_factory=list)
    vouchers: list[dict[str, Any]] = Field(default_factory=list)
    seller_badge: TokopediaSellerBadge | None = None
    timestamp: str | None = None
    input: dict[str, Any] | None = None
    discovery_input: dict[str, Any] | None = None


class TokopediaProductPayload(RootModel[list[TokopediaProductRecord]]):
    pass


class CommerceVariantOption(LooseModel):
    option_id: str | None = None
    option_name: str | None = None
    option_price: str | float | None = None
    in_stock: bool | None = None
    image: str | None = None


class CommerceVariantGroup(LooseModel):
    variant_type: str | None = None
    variant_options: list[CommerceVariantOption] | None = None


class CommerceReview(LooseModel):
    review_id: str | None = None
    title: str | None = None
    content: str | None = None
    min_rating: float | None = None
    max_rating: float | None = None
    rating: float | None = None


class SephoraProductRecord(LooseModel):
    url: str
    item_id: str
    variant_id: str | None = None
    title: str
    description: str | None = None
    product_category: str | None = None
    category_tree: list[UrlName] = Field(default_factory=list)
    brand: str | None = None
    image_url: str | None = None
    price: str | None = None
    sale_price: str | None = None
    availability: str | None = None
    availability_date: str | None = None
    group_id: str | None = None
    listing_has_variations: bool = False
    variant_attributes: list[NameValue] = Field(default_factory=list)
    variants: list[CommerceVariantGroup] = Field(default_factory=list)
    store_name: str | None = None
    seller_url: str | None = None
    seller_privacy_policy: str | None = None
    seller_tos: str | None = None
    return_policy: str | None = None
    return_window: int | None = None
    target_countries: list[str] = Field(default_factory=list)
    store_country: str | None = None
    category_urls: list[str] = Field(default_factory=list)
    star_rating: float | None = None
    review_count: int = 0
    reviews: list[CommerceReview] = Field(default_factory=list)
    additional_image_urls: list[str] = Field(default_factory=list)
    timestamp: str | None = None
    input: dict[str, Any] | None = None
    discovery_input: dict[str, Any] | None = None


class SephoraProductPayload(RootModel[list[SephoraProductRecord]]):
    pass


class AlibabaProductRecord(LooseModel):
    url: str
    item_id: str
    variant_id: str | None = None
    title: str
    description: str | None = None
    product_category: str | None = None
    category_tree: list[UrlName] = Field(default_factory=list)
    brand: str | None = None
    image_url: str | None = None
    price: str | None = None
    sale_price: str | None = None
    availability: str | None = None
    availability_date: str | None = None
    group_id: str | None = None
    listing_has_variations: bool = False
    variant_attributes: list[NameValue] = Field(default_factory=list)
    variants: list[CommerceVariantGroup] = Field(default_factory=list)
    store_name: str | None = None
    seller_url: str | None = None
    seller_privacy_policy: str | None = None
    seller_tos: str | None = None
    return_policy: str | None = None
    return_window: int | None = None
    target_countries: list[str] = Field(default_factory=list)
    store_country: str | None = None
    category_urls: list[str] = Field(default_factory=list)
    star_rating: float | None = None
    review_count: int = 0
    reviews: list[CommerceReview] | None = None
    additional_image_urls: list[str] = Field(default_factory=list)
    timestamp: str | None = None
    input: dict[str, Any] | None = None
    discovery_input: dict[str, Any] | None = None


class AlibabaProductPayload(RootModel[list[AlibabaProductRecord]]):
    pass


class LazadaVariationGroup(LooseModel):
    name: str | None = None
    variations: list[str] = Field(default_factory=list)


class LazadaProductVariation(LooseModel):
    name: str | None = None
    value: str | None = None
    price: float | None = None
    stock: bool | int | None = None
    sku: str | None = None
    image: str | None = None


class LazadaProductRecord(LooseModel):
    url: str
    title: str
    rating: str | float | None = None
    reviews: int | None = None
    initial_price: float | None = None
    final_price: float | None = None
    currency: str
    stock: bool
    image: list[str] = Field(default_factory=list)
    video: list[str] = Field(default_factory=list)
    seller_name: str | None = None
    shop_url: str | None = None
    breadcrumb: list[str] = Field(default_factory=list)
    product_specifications: list[NameValue] = Field(default_factory=list)
    product_description: str | None = None
    sku: str | None = None
    mpn: str | None = None
    colors: list[str] = Field(default_factory=list)
    variations: list[LazadaVariationGroup] = Field(default_factory=list)
    product_variation: list[LazadaProductVariation] = Field(default_factory=list)
    color: str | None = None
    returns_and_warranty: list[str] = Field(default_factory=list)
    is_super_seller: bool = False
    sizes: list[str] | None = None
    promotions: list[str] | None = None
    brand: str | None = None
    lazmall: bool = False
    domain: str
    number_sold: int | None = None
    gmv: float | None = None
    timestamp: str | None = None
    input: dict[str, Any] | None = None
    discovery_input: dict[str, Any] | None = None


class LazadaProductPayload(RootModel[list[LazadaProductRecord]]):
    pass


class LazadaSearchGmvRecord(LooseModel):
    url: str
    name: str
    price: float | None = None
    currency: str
    number_sold: int | None = None
    sku: str | None = None
    image_url: str | None = None
    rating: float | None = None
    reviews: int | None = None
    discount_percentage: int | None = None
    category_url: str | None = None
    gmv: float | None = None
    domain: str | None = None
    timestamp: str | None = None
    input: dict[str, Any] | None = None


class LazadaSearchGmvPayload(RootModel[list[LazadaSearchGmvRecord]]):
    pass


class LazadaReviewRecord(LooseModel):
    url: str
    title: str
    rating: float | None = None
    reviews: int | None = None
    seller_name: str | None = None
    sku: str | None = None
    mpn: str | None = None
    is_super_seller: bool = False
    brand: str | None = None
    breadcrumb: list[str] = Field(default_factory=list)
    review_username: str | None = None
    review: str | None = None
    verified_purchase: bool | None = None
    review_star_rating: float | None = None
    review_date: str | None = None
    count_images: int = 0
    count_videos: int = 0
    review_likes: int = 0
    review_id: str | None = None
    replies: list[dict[str, Any]] = Field(default_factory=list)
    lazmall: bool = False
    start_date: str | None = None
    end_date: str | None = None
    timestamp: str | None = None
    input: dict[str, Any] | None = None


class LazadaReviewPayload(RootModel[list[LazadaReviewRecord]]):
    pass


class EtsyProductSpecification(LooseModel):
    specification_name: str | None = None
    specification_values: str | list[str] | None = None


class EtsyFaq(LooseModel):
    question: str | None = None
    answer: str | None = None


class EtsyVariation(LooseModel):
    type: str | None = None
    value: str | list[str] | None = None


class EtsyProductRecord(LooseModel):
    url: str
    product_id: str
    listing_inventory_id: str | int | None = None
    title: str
    rating: float | None = None
    reviews_count_shop: int | None = None
    reviews_count_item: int | None = None
    initial_price: float | None = None
    discount_percentage: int | float | None = None
    final_price: float | None = None
    currency: str | None = None
    images: list[str] = Field(default_factory=list)
    breadcrumbs: list[UrlName] = Field(default_factory=list)
    root_category: str | None = None
    seller_name: str | None = None
    seller_shop_name: str | None = None
    seller_response: str | None = None
    item_details: list[str] = Field(default_factory=list)
    shipping_return_policies: list[str] = Field(default_factory=list)
    product_specifications: list[EtsyProductSpecification] = Field(default_factory=list)
    faqs: list[EtsyFaq] = Field(default_factory=list)
    category_tree: list[str] = Field(default_factory=list)
    liisted_date: str | None = None
    seller_shop_url: str | None = None
    variation: list[EtsyVariation] = Field(default_factory=list)
    variations: list[EtsyVariation] = Field(default_factory=list)
    videos: list[str] = Field(default_factory=list)
    highlights: list[str] = Field(default_factory=list)
    item_details_html: str | None = None
    highlights_lines: list[NameValue] = Field(default_factory=list)
    variation_url: str | None = None
    is_star_seller: bool | None = None
    sku: str | int | None = None
    description: str | None = None
    product_category: str | None = None
    nai_category_tree: list[UrlName] = Field(default_factory=list)
    image_url: str | None = None
    price: str | float | None = None
    sale_price: str | float | None = None
    availability: str | None = None
    availability_date: str | None = None
    group_id: str | None = None
    listing_has_variations: bool | None = None
    variant_attributes: list[NameValue] = Field(default_factory=list)
    nai_variants: list[CommerceVariantGroup] = Field(default_factory=list)
    store_name: str | None = None
    seller_url: str | None = None
    seller_privacy_policy: str | None = None
    seller_tos: str | None = None
    return_policy: str | None = None
    return_window: int | None = None
    target_countries: list[str] = Field(default_factory=list)
    store_country: str | None = None
    category_urls: list[str] = Field(default_factory=list)
    brand: str | None = None
    variant_id: str | None = None
    timestamp: str | None = None
    input: dict[str, Any] | None = None
    discovery_input: dict[str, Any] | None = None


class EtsyProductPayload(RootModel[list[EtsyProductRecord]]):
    pass


class AmazonVariation(LooseModel):
    asin: str | None = None
    color: str | None = None
    currency: str | None = None
    image: str | None = None
    name: str | None = None
    price: PriceAmount | None = None
    size: str | None = None
    unit_price: str | None = None


class AmazonBuyboxPrices(LooseModel):
    final_price: PriceAmount | None = None
    unit_price: str | None = None


class AmazonPricesBreakdown(LooseModel):
    deal_type: str | None = None
    list_price: str | float | None = None
    typical_price: str | float | None = None


class AmazonRatingObject(LooseModel):
    five_star: int | None = None
    four_star: int | None = None
    three_star: int | None = None
    two_star: int | None = None
    one_star: int | None = None


class AmazonCategoryWithUrl(LooseModel):
    category_name: str | None = None
    url: str | None = None


class AmazonVariationValues(LooseModel):
    variant_name: str | None = None
    values: list[str] = Field(default_factory=list)


class AmazonCustomersSayKeywords(LooseModel):
    mixed: list[str] | str | None = None
    negative: list[str] | str | None = None
    positive: list[str] | str | None = None


class AmazonCustomersSay(LooseModel):
    keywords: AmazonCustomersSayKeywords | None = None
    text: str | None = None


class AmazonProductRecord(LooseModel):
    title: str
    seller_name: str | None = None
    brand: str | None = None
    description: str | None = None
    initial_price: float | None = None
    currency: str | None = None
    availability: str | None = None
    reviews_count: int | None = None
    categories: list[str] = Field(default_factory=list)
    parent_asin: str | None = None
    asin: str | None = None
    buybox_seller: str | None = None
    number_of_sellers: int | None = None
    root_bs_rank: int | None = None
    ISBN10: str | None = None
    answered_questions: int | None = None
    domain: str | None = None
    images_count: int | None = None
    url: str
    video_count: int | None = None
    image_url: str | None = None
    item_weight: str | None = None
    rating: float | None = None
    product_dimensions: str | None = None
    seller_id: str | None = None
    image: str | None = None
    date_first_available: str | None = None
    discount: str | float | None = None
    model_number: str | None = None
    manufacturer: str | None = None
    department: str | None = None
    plus_content: bool | None = None
    upc: str | None = None
    video: bool | None = None
    top_review: str | None = None
    final_price_high: float | None = None
    final_price: float | None = None
    variations: list[AmazonVariation] | None = None
    delivery: list[str] | None = None
    features: list[str] = Field(default_factory=list)
    format: str | None = None
    buybox_prices: AmazonBuyboxPrices | None = None
    input_asin: str | None = None
    ingredients: str | None = None
    origin_url: str | None = None
    bought_past_month: int | None = None
    is_available: bool | None = None
    root_bs_category: str | None = None
    bs_category: str | None = None
    bs_rank: int | None = None
    badge: str | None = None
    subcategory_rank: list[dict[str, Any]] | None = None
    amazon_choice: bool | None = None
    images: list[str] = Field(default_factory=list)
    product_details: list[TypeValue] = Field(default_factory=list)
    prices_breakdown: AmazonPricesBreakdown | None = None
    country_of_origin: str | None = None
    from_the_brand: str | None = None
    product_description: str | None = None
    seller_url: str | None = None
    customer_says: str | None = None
    sustainability_features: str | None = None
    climate_pledge_friendly: bool | None = None
    videos: list[dict[str, Any]] | None = None
    other_sellers_prices: list[dict[str, Any]] | None = None
    downloadable_videos: list[dict[str, Any]] | None = None
    editorial_reviews: list[dict[str, Any]] | None = None
    about_the_author: str | None = None
    zipcode: str | None = None
    coupon: str | None = None
    sponsered: bool | None = None
    sponsored: bool | None = None
    store_url: str | None = None
    ships_from: str | None = None
    city: str | None = None
    customers_say: AmazonCustomersSay | None = None
    max_quantity_available: int | None = None
    variations_values: list[AmazonVariationValues] | None = None
    language: str | None = None
    return_policy: str | None = None
    inactive_buy_box: dict[str, Any] | None = None
    buybox_seller_rating: float | None = None
    premium_brand: bool | None = None
    amazon_prime: bool | None = None
    coupon_description: str | None = None
    all_badges: list[str] | None = None
    safety_information: str | None = None
    subcategory_link: list[dict[str, Any]] | None = None
    is_frequently_returned_item_badge: bool | None = None
    frequently_returned_item_message: str | None = None
    is_customers_usually_keep: bool | None = None
    title_badge: str | None = None
    categories_with_urls: list[AmazonCategoryWithUrl] | None = None
    description_html: str | None = None
    fba_sellers_count: int | None = None
    fbm_sellers_count: int | None = None
    is_amazon_as_seller: bool | None = None
    publisher_images: list[str] | None = None
    coupon_text: str | None = None
    is_sponsored_search_page: bool | None = None


class AmazonProductPayload(RootModel[list[AmazonProductRecord]]):
    pass


class AmazonSearchProductRecord(LooseModel):
    asin: str
    url: str
    name: str
    sponsored: str | bool | None = None
    initial_price: float | None = None
    final_price: float | None = None
    currency: str | None = None
    sold: int | None = None
    rating: float | None = None
    num_ratings: int | None = None
    variations: list[dict[str, Any]] | None = None
    badge: str | None = None
    business_type: str | None = None
    brand: str | None = None
    delivery: list[str] = Field(default_factory=list)
    keyword: str | None = None
    image: str | None = None
    domain: str | None = None
    bought_past_month: int | None = None
    page_number: int | None = None
    rank_on_page: int | None = None
    is_prime: bool | None = None
    is_subscribe_and_save: bool | None = None
    is_coupon: bool | None = None
    sponsored_video: str | None = None
    is_banner_product: bool | None = None
    is_amazon_fresh: bool | None = None
    total_results: int | None = None


class AmazonSearchProductPayload(RootModel[list[AmazonSearchProductRecord]]):
    pass


class AmazonReviewRecord(LooseModel):
    url: str
    product_name: str
    product_rating: float | None = None
    product_rating_object: AmazonRatingObject | None = None
    product_rating_max: int | None = None
    rating: float | None = None
    author_name: str | None = None
    asin: str | None = None
    product_rating_count: int | None = None
    review_header: str | None = None
    review_id: str | None = None
    review_text: str | None = None
    author_id: str | None = None
    author_link: str | None = None
    badge: str | None = None
    brand: str | None = None
    review_posted_date: str | None = None
    review_country: str | None = None
    review_images: list[str] | None = None
    helpful_count: int | None = None
    is_amazon_vine: bool | None = None
    is_verified: bool | None = None
    variant_asin: str | None = None
    variant_name: str | None = None
    videos: list[dict[str, Any]] | None = None
    categories: list[str] = Field(default_factory=list)
    department: str | None = None


class AmazonReviewPayload(RootModel[list[AmazonReviewRecord]]):
    pass


class AmazonSellerFeedback(LooseModel):
    date: str | None = None
    stars: str | None = None
    text: str | None = None


class AmazonSellerInfoRecord(LooseModel):
    seller_id: str
    url: str
    seller_name: str | None = None
    description: str | None = None
    detailed_info: list[TypeValue] = Field(default_factory=list)
    stars: str | None = None
    feedbacks: list[AmazonSellerFeedback] = Field(default_factory=list)
    return_policy: list[str] = Field(default_factory=list)
    shipping_policies: str | None = None
    privacy_security: str | None = None
    privacy_policy: str | None = None
    tax_info: str | None = None
    help_content: str | None = None
    products_link: str | None = None
    buisness_name: str | None = None
    buisness_address: str | None = None
    rating_positive: str | None = None
    brands: list[str] | None = None
    feedbacks_percentages: dict[str, str] | None = None
    rating_count_m12: int | None = None
    rating_count_m3: int | None = None
    rating_count_lifetime: int | None = None
    rating_count_m1: int | None = None
    country: str | None = None
    email: str | None = None
    seller_phone_number: str | None = None
    rating_count: int | None = None
    delivery_rates: str | None = None
    products_count: int | None = None


class AmazonSellerInfoPayload(RootModel[list[AmazonSellerInfoRecord]]):
    pass


class WalmartTopReview(LooseModel):
    rating: float | None = None
    review: str | None = None


class WalmartTopReviews(LooseModel):
    negative: WalmartTopReview | None = None
    positive: WalmartTopReview | None = None


class WalmartRatingStars(LooseModel):
    one_star: int | None = None
    two_stars: int | None = None
    three_stars: int | None = None
    four_stars: int | None = None
    five_stars: int | None = None


class WalmartCustomerReview(LooseModel):
    name: str | None = None
    title: str | None = None
    review: str | None = None
    rating: float | None = None
    date: str | None = None
    review_id: str | None = None
    min_rating: float | None = None
    max_rating: float | None = None
    incentivized_review: bool | None = None


class WalmartSellerInfo(LooseModel):
    seller_id: str | None = None
    seller_url: str | None = None
    seller_name: str | None = None


class WalmartVariantAttribute(LooseModel):
    variant_name: str | None = None
    variant_values: list[str] = Field(default_factory=list)


class WalmartPickupExtras(LooseModel):
    available_quantity: int | None = None
    max_order_quantity: int | None = None
    availability_status: str | None = None
    location: str | None = None


class WalmartShippingExtras(LooseModel):
    available_quantity: int | None = None
    max_order_quantity: int | None = None
    max_delivery_date: str | None = None
    fulfillment_badge: str | None = None
    delivery_date: str | None = None
    order_cut_off_time: str | None = None
    fulfillment_price: float | None = None
    is_free_fulfillment: bool | None = None
    location: str | None = None
    availability_status: str | None = None


class WalmartReturnWindow(LooseModel):
    value: int | None = None
    unit_type: str | None = None


class WalmartReturnExtras(LooseModel):
    is_returnable: bool | None = None
    is_free_returns: bool | None = None
    return_window: WalmartReturnWindow | None = None
    return_policy: str | None = None
    return_policy_text_code: str | None = None
    return_policy_condition: str | None = None
    is_holiday_return_enabled: bool | None = None


class WalmartVariantPrice(LooseModel):
    value: float | None = None
    currency: str | None = None
    discount_value: float | None = None
    discount_percent: float | None = None
    is_discounted: bool | None = None


class WalmartVariantImage(LooseModel):
    id: str | None = None
    url: str | None = None
    is_zoomable: bool | None = None


class WalmartVariant(LooseModel):
    id: str | None = None
    us_item_id: str | None = None
    url: str | None = None
    in_stock: bool | None = None
    price: WalmartVariantPrice | None = None
    images: list[WalmartVariantImage] = Field(default_factory=list)
    criteria: list[NameValue] = Field(default_factory=list)


class WalmartVideo(LooseModel):
    poster_url: str | None = None
    title: str | None = None
    video_url: str | None = None


class WalmartProductRecord(LooseModel):
    url: str
    final_price: float | None = None
    sku: str | None = None
    currency: str
    gtin: str | None = None
    specifications: list[NameValue] = Field(default_factory=list)
    image_urls: list[str] = Field(default_factory=list)
    top_reviews: WalmartTopReviews | None = None
    rating_stars: WalmartRatingStars | None = None
    related_pages: list[str] = Field(default_factory=list)
    available_for_delivery: bool | None = None
    available_for_pickup: bool | None = None
    brand: str | None = None
    breadcrumbs: list[UrlName] = Field(default_factory=list)
    category_ids: str | None = None
    review_count: int | None = None
    description: str | None = None
    product_id: str | None = None
    product_name: str | None = None
    review_tags: list[str] | None = None
    category_name: str | None = None
    root_category_name: str | None = None
    rating: float | None = None
    customer_reviews: list[WalmartCustomerReview] = Field(default_factory=list)
    ingredients: str | None = None
    availability: str | None = None
    store_name: str | None = None
    store_location: str | None = None
    seller_info: list[WalmartSellerInfo] = Field(default_factory=list)
    variant_attribute: list[WalmartVariantAttribute] = Field(default_factory=list)
    variant_attributes: list[NameValue] = Field(default_factory=list)
    pickup_extras: WalmartPickupExtras | None = None
    shipping_extras: WalmartShippingExtras | None = None
    return_extras: WalmartReturnExtras | None = None
    variants: list[WalmartVariant] = Field(default_factory=list)
    videos: list[WalmartVideo] | None = None
    zip_code: str | None = None
    store_id: str | int | None = None
    timestamp: str | None = None
    input: dict[str, Any] | None = None
    discovery_input: dict[str, Any] | None = None


class WalmartProductPayload(RootModel[list[WalmartProductRecord]]):
    pass


class WalmartSearchImageInfo(LooseModel):
    url: str | None = None
    id: str | None = None
    name: str | None = None
    thumbnail_url: str | None = None
    size: str | None = None
    all_images: list[str] = Field(default_factory=list)


class WalmartSearchBadge(LooseModel):
    key: str | None = None
    text: str | None = None
    type: str | None = None
    id: str | None = None
    style_id: str | None = None


class WalmartBadgeGroupMember(LooseModel):
    id: str | None = None
    key: str | None = None
    member_type: str | None = None
    rank: int | None = None
    sla_text: str | None = None
    text: str | None = None


class WalmartBadgeGroup(LooseModel):
    name: str | None = None
    members: list[WalmartBadgeGroupMember] = Field(default_factory=list)


class WalmartSearchBadges(LooseModel):
    flags: list[WalmartSearchBadge] = Field(default_factory=list)
    groups: list[WalmartBadgeGroup] = Field(default_factory=list)


class WalmartAvailabilityStatus(LooseModel):
    display: str | None = None
    value: str | None = None


class WalmartFulfillmentSummary(LooseModel):
    fulfillment: str | None = None
    store_id: str | None = None
    delivery_date: str | None = None
    fulfillment_methods: list[str] = Field(default_factory=list)


class WalmartSearchPriceInfo(LooseModel):
    item_price: str | None = None
    line_price: str | None = None
    line_price_display: str | None = None
    savings: str | None = None
    savings_amt: float | None = None
    was_price: str | None = None
    ship_price: str | None = None


class WalmartSearchRating(LooseModel):
    average_rating: float | None = None
    number_of_reviews: int | None = None


class WalmartSearchRecord(LooseModel):
    id: str
    url: str
    typename: str | None = None
    us_item_id: str | None = None
    name: str
    type: str | None = None
    short_description: str | None = None
    image_info: WalmartSearchImageInfo | None = None
    canonical_url: str | None = None
    badges: WalmartSearchBadges | None = None
    seller_id: str | None = None
    seller_name: str | None = None
    availability_status_v2: WalmartAvailabilityStatus | None = None
    fulfillment_summary: list[WalmartFulfillmentSummary] = Field(default_factory=list)
    price_info: WalmartSearchPriceInfo | None = None
    flag: str | None = None
    price: float | None = None
    rating: WalmartSearchRating | None = None
    product_index: int | None = None
    page_number: int | None = None
    placement_on_page: int | None = None
    currency: str | None = None
    timestamp: str | None = None
    input: dict[str, Any] | None = None


class WalmartSearchPayload(RootModel[list[WalmartSearchRecord]]):
    pass


class WalmartSellerReviewSummary(LooseModel):
    total_review_count: int | None = None
    reviews_with_text_count: int | None = None
    average_overall_rating: float | None = None


class WalmartSellerReviews(LooseModel):
    review_summary: WalmartSellerReviewSummary | None = None


class WalmartSellerInfoRecord(LooseModel):
    seller_id: str
    url: str
    catalog_seller_id: str | None = None
    seller_name: str | None = None
    seller_display_name: str | None = None
    seller_email: str | None = None
    seller_phone: str | None = None
    seller_about_us: str | None = None
    address1: str | None = None
    address2: str | None = None
    city: str | None = None
    country_code: str | None = None
    postal_code: str | None = None
    state: str | None = None
    country: str | None = None
    has_seller_badge: bool | None = None
    deactivation_status: str | None = None
    is_address_visibility_exempted: bool | None = None
    is_contact_visibility_exempted: bool | None = None
    seller_type: str | None = None
    is_alcohol_seller: bool | None = None
    seller_reviews: WalmartSellerReviews | None = None
    timestamp: str | None = None
    input: dict[str, Any] | None = None


class WalmartSellerInfoPayload(RootModel[list[WalmartSellerInfoRecord]]):
    pass


class TikTokProfileRecord(LooseModel):
    url: str | None = None
    account_id: str | None = None
    nickname: str | None = None
    biography: str | None = None
    followers: int | None = None
    following: int | None = None
    likes: int | None = None
    videos_count: int | None = None
    is_verified: bool | None = None
    is_private: bool | None = None
    profile_pic_url: str | None = None
    top_videos: list[dict[str, Any]] | None = None
    top_posts_data: list[dict[str, Any]] | None = None
    timestamp: str | None = None
    input: dict[str, Any] | None = None
    discovery_input: dict[str, Any] | None = None


class TikTokProfilePayload(RootModel[list[TikTokProfileRecord]]):
    pass


class TikTokPostRecord(LooseModel):
    url: str | None = None
    post_id: str | None = None
    description: str | None = None
    create_time: str | None = None
    digg_count: int | None = None
    share_count: str | int | None = None
    collect_count: int | None = None
    comment_count: int | None = None
    play_count: int | None = None
    video_duration: int | float | None = None
    hashtags: list[str] | None = None
    profile_id: str | None = None
    profile_username: str | None = None
    profile_url: str | None = None
    profile_followers: int | None = None
    region: str | None = None
    video_url: str | None = None
    timestamp: str | None = None
    input: dict[str, Any] | None = None
    discovery_input: dict[str, Any] | None = None


class TikTokPostPayload(RootModel[list[TikTokPostRecord]]):
    pass


class TikTokCommentRecord(LooseModel):
    url: str | None = None
    post_url: str | None = None
    post_id: str | None = None
    post_date_created: str | None = None
    date_created: str | None = None
    comment_text: str | None = None
    num_likes: int | None = None
    num_replies: int | None = None
    commenter_user_name: str | None = None
    commenter_id: str | None = None
    commenter_url: str | None = None
    comment_id: str | None = None
    comment_url: str | None = None
    replies: list[dict[str, Any]] | None = None
    timestamp: str | None = None
    input: dict[str, Any] | None = None


class TikTokCommentPayload(RootModel[list[TikTokCommentRecord]]):
    pass


class TikTokShopProductRecord(LooseModel):
    url: str | None = None
    title: str | None = None
    product_id: str | None = None
    id: str | None = None
    available: bool | None = None
    description: str | None = None
    currency: str | None = None
    initial_price: float | None = None
    final_price: float | None = None
    sold: int | None = None
    product_rating: float | None = None
    reviews_count: int | None = None
    reviews: list[dict[str, Any]] | None = None
    category: str | None = None
    category_name: str | None = None
    category_url: str | None = None
    images: list[str] | None = None
    image_url: str | None = None
    store_name: str | None = None
    seller_url: str | None = None
    store_country: str | None = None
    timestamp: str | None = None
    input: dict[str, Any] | None = None
    discovery_input: dict[str, Any] | None = None


class TikTokShopProductPayload(RootModel[list[TikTokShopProductRecord]]):
    pass


class InstagramProfilePost(LooseModel):
    caption: str | None = None
    comments: int | None = None
    datetime: str | None = None
    id: str | None = None
    image_url: str | None = None
    likes: int | None = None
    post_hashtags: list[str] | None = None
    content_type: str | None = None
    url: str | None = None
    video_url: str | None = None
    is_pinned: bool | None = None


class InstagramProfileRecord(LooseModel):
    account: str | None = None
    id: str | None = None
    followers: int | None = None
    posts_count: int | None = None
    is_business_account: bool | None = None
    is_professional_account: bool | None = None
    is_verified: bool | None = None
    avg_engagement: float | None = None
    biography: str | None = None
    following: int | None = None
    posts: list[InstagramProfilePost] | None = None
    profile_image_link: str | None = None
    profile_url: str | None = None
    profile_name: str | None = None
    full_name: str | None = None
    is_private: bool | None = None
    url: str | None = None
    timestamp: str | None = None
    input: dict[str, Any] | None = None


class InstagramProfilePayload(RootModel[list[InstagramProfileRecord]]):
    pass


class InstagramPostRecord(LooseModel):
    url: str | None = None
    user_posted: str | None = None
    description: str | None = None
    hashtags: list[str] | None = None
    num_comments: int | None = None
    date_posted: str | None = None
    likes: int | None = None
    views: int | None = None
    video_play_count: int | None = None
    photos: list[str] | None = None
    videos: list[str] | None = None
    location: str | None = None
    top_comments: list[dict[str, Any]] | None = None
    latest_comments: list[dict[str, Any]] | None = None
    post_id: str | None = None
    shortcode: str | None = None
    content_type: str | None = None
    content_id: str | None = None
    thumbnail: str | None = None
    followers: int | None = None
    posts_count: int | None = None
    profile_url: str | None = None
    user_profile_url: str | None = None
    is_paid_partnership: bool | None = None
    is_verified: bool | None = None


class InstagramPostPayload(RootModel[list[InstagramPostRecord]]):
    pass


class InstagramCommentRecord(LooseModel):
    url: str | None = None
    comment_user: str | None = None
    comment_user_url: str | None = None
    comment_date: str | None = None
    comment: str | None = None
    likes_number: int | None = None
    replies_number: int | None = None
    replies: list[dict[str, Any]] | None = None
    hashtag_comment: list[str] | None = None
    tagged_users_in_comment: list[dict[str, Any]] | None = None
    post_url: str | None = None
    post_user: str | None = None
    comment_id: str | None = None
    post_id: str | None = None


class InstagramCommentPayload(RootModel[list[InstagramCommentRecord]]):
    pass


class XPostRecord(LooseModel):
    id: str | None = None
    user_posted: str | None = None
    name: str | None = None
    description: str | None = None
    date_posted: str | None = None
    photos: list[str] | None = None
    url: str | None = None
    replies: int | None = None
    reposts: int | None = None
    likes: int | None = None
    views: int | None = None
    external_url: str | None = None
    hashtags: list[str] | None = None
    followers: int | None = None
    biography: str | None = None
    posts_count: int | None = None
    profile_image_link: str | None = None
    following: int | None = None
    is_verified: bool | None = None
    quotes: int | None = None
    bookmarks: int | None = None
    user_id: str | None = None
    input: dict[str, Any] | None = None
    discovery_input: dict[str, Any] | None = None


class XPostPayload(RootModel[list[XPostRecord]]):
    pass


class XProfileRecord(LooseModel):
    x_id: str | None = None
    url: str | None = None
    id: str | None = None
    profile_name: str | None = None
    biography: str | None = None
    is_verified: bool | None = None
    profile_image_link: str | None = None
    external_link: str | None = None
    date_joined: str | None = None
    following: int | None = None
    followers: int | None = None
    subscriptions: int | None = None
    location: str | None = None
    posts_count: int | None = None
    posts: list[XPostRecord] | None = None
    banner_image: str | None = None
    input: dict[str, Any] | None = None


class XProfilePayload(RootModel[list[XProfileRecord]]):
    pass


BRIGHTDATA_SCHEMA_REGISTRY: dict[str, type[BaseModel]] = {
    "brightdata.error": BrightDataErrorPayload,
    "tokopedia.products": TokopediaProductPayload,
    "sephora.products": SephoraProductPayload,
    "alibaba.products": AlibabaProductPayload,
    "lazada.products": LazadaProductPayload,
    "lazada.products.search_gmv": LazadaSearchGmvPayload,
    "lazada.reviews": LazadaReviewPayload,
    "etsy.products": EtsyProductPayload,
    "amazon.products": AmazonProductPayload,
    "amazon.products.search": AmazonSearchProductPayload,
    "amazon.reviews": AmazonReviewPayload,
    "amazon.seller_info": AmazonSellerInfoPayload,
    "walmart.products": WalmartProductPayload,
    "walmart.products.search": WalmartSearchPayload,
    "walmart.seller_info": WalmartSellerInfoPayload,
    "tiktok.profiles": TikTokProfilePayload,
    "tiktok.posts": TikTokPostPayload,
    "tiktok.comments": TikTokCommentPayload,
    "tiktok.shop.products": TikTokShopProductPayload,
    "instagram.profiles": InstagramProfilePayload,
    "instagram.posts": InstagramPostPayload,
    "instagram.reels": InstagramPostPayload,
    "instagram.comments": InstagramCommentPayload,
    "x.profiles": XProfilePayload,
    "x.posts": XPostPayload,
}


class BrightDataDatasetKey(LooseModel):
    key: str
    description: str
    model: str
    endpoints: list[str] = Field(default_factory=list)


BRIGHTDATA_DATASET_KEYS: list[BrightDataDatasetKey] = [
    BrightDataDatasetKey(
        key="tokopedia.products",
        description="Tokopedia product detail and discovery results.",
        model="TokopediaProductPayload",
        endpoints=[
            "Tokopedia Products - collect by URL",
            "Tokopedia Products - discover by category URL",
            "Tokopedia Products - discover by keyword",
            "Tokopedia Products - discover by seller URL",
        ],
    ),
    BrightDataDatasetKey(
        key="sephora.products",
        description="Sephora product detail and sitemap discovery results.",
        model="SephoraProductPayload",
        endpoints=["Sephora Products - collect by URL", "Sephora Products - discover by sitemap"],
    ),
    BrightDataDatasetKey(
        key="alibaba.products",
        description="Alibaba product detail and category/search discovery results.",
        model="AlibabaProductPayload",
        endpoints=["Alibaba - collect by URL", "Alibaba - discover by category URL"],
    ),
    BrightDataDatasetKey(
        key="lazada.products",
        description="Lazada product detail discovery results.",
        model="LazadaProductPayload",
        endpoints=[
            "Lazada Products - discover by category",
            "Lazada Products - discover by keyword",
            "Lazada Products - discover by seller",
        ],
    ),
    BrightDataDatasetKey(
        key="lazada.products.search_gmv",
        description="Lazada search/category listing result with GMV fields.",
        model="LazadaSearchGmvPayload",
        endpoints=["Lazada products search (GMV) - collect by URL"],
    ),
    BrightDataDatasetKey(
        key="lazada.reviews",
        description="Lazada product review collection results.",
        model="LazadaReviewPayload",
        endpoints=["Lazada Reviews - collect by URL"],
    ),
    BrightDataDatasetKey(
        key="etsy.products",
        description="Etsy product detail, keyword discovery, and shop discovery results.",
        model="EtsyProductPayload",
        endpoints=[
            "Etsy - collect by URL",
            "Etsy - discover by keyword",
            "Etsy - discover by shop URL",
        ],
    ),
    BrightDataDatasetKey(
        key="amazon.products",
        description="Amazon product detail, best seller, category, brand, keyword, and seller discovery results.",
        model="AmazonProductPayload",
        endpoints=[
            "Amazon - collect by URL",
            "Amazon - discover by best seller URL",
            "Amazon - discover by category URL",
            "Amazon - discover by keyword",
            "Amazon - discover by UPC",
            "Amazon - discover by brand",
            "Amazon - discover by seller",
            "Amazon Product Global Dataset variants",
        ],
    ),
    BrightDataDatasetKey(
        key="amazon.products.search",
        description="Amazon product search result tiles.",
        model="AmazonSearchProductPayload",
        endpoints=["Amazon - collect by URL (Product search)"],
    ),
    BrightDataDatasetKey(
        key="amazon.reviews",
        description="Amazon product review collection results.",
        model="AmazonReviewPayload",
        endpoints=["Amazon - collect reviews by URL"],
    ),
    BrightDataDatasetKey(
        key="amazon.seller_info",
        description="Amazon seller profile and feedback collection results.",
        model="AmazonSellerInfoPayload",
        endpoints=["Amazon - collect seller info by URL"],
    ),
    BrightDataDatasetKey(
        key="walmart.products",
        description="Walmart product detail, SKU, category, keyword, and zipcode product results.",
        model="WalmartProductPayload",
        endpoints=[
            "Walmart - collect by URL",
            "Walmart - discover by category URL",
            "Walmart - discover by keyword",
            "Walmart - discover by SKU",
            "Walmart products zipcodes - collect/discover",
        ],
    ),
    BrightDataDatasetKey(
        key="walmart.products.search",
        description="Walmart search result tiles.",
        model="WalmartSearchPayload",
        endpoints=["Walmart products search - collect by URL"],
    ),
    BrightDataDatasetKey(
        key="walmart.seller_info",
        description="Walmart seller profile collection results.",
        model="WalmartSellerInfoPayload",
        endpoints=["Walmart Seller Info - collect by URL"],
    ),
    BrightDataDatasetKey(
        key="tiktok.profiles",
        description="TikTok profile data and profile/search discovery results.",
        model="TikTokProfilePayload",
        endpoints=["TikTok - profile by URL", "TikTok - profile/search URL discovery"],
    ),
    BrightDataDatasetKey(
        key="tiktok.posts",
        description="TikTok post/video data collected by URL, keyword, profile, and discovery URLs.",
        model="TikTokPostPayload",
        endpoints=[
            "TikTok - post by URL",
            "TikTok - post by keyword",
            "TikTok - posts by profile URL",
            "TikTok - posts/discover pages by URL",
        ],
    ),
    BrightDataDatasetKey(
        key="tiktok.comments",
        description="TikTok video comment collection results.",
        model="TikTokCommentPayload",
        endpoints=["TikTok - comments by URL"],
    ),
    BrightDataDatasetKey(
        key="tiktok.shop.products",
        description="TikTok Shop product detail, category, keyword, and shop discovery results.",
        model="TikTokShopProductPayload",
        endpoints=[
            "TikTok Shop - product by URL",
            "TikTok Shop - discover by category",
            "TikTok Shop - discover by keyword",
            "TikTok Shop - discover by shop",
            "TikTok Shop - category listing by URL",
        ],
    ),
    BrightDataDatasetKey(
        key="instagram.profiles",
        description="Instagram profile collection results.",
        model="InstagramProfilePayload",
        endpoints=["Instagram - profiles by URL"],
    ),
    BrightDataDatasetKey(
        key="instagram.posts",
        description="Instagram post collection results.",
        model="InstagramPostPayload",
        endpoints=["Instagram - posts by URL"],
    ),
    BrightDataDatasetKey(
        key="instagram.reels",
        description="Instagram reel collection results.",
        model="InstagramPostPayload",
        endpoints=["Instagram - reels by URL"],
    ),
    BrightDataDatasetKey(
        key="instagram.comments",
        description="Instagram comment collection results.",
        model="InstagramCommentPayload",
        endpoints=["Instagram - comments by URL"],
    ),
    BrightDataDatasetKey(
        key="x.profiles",
        description="X/Twitter profile collection results with recent posts.",
        model="XProfilePayload",
        endpoints=["X - profile by URL"],
    ),
    BrightDataDatasetKey(
        key="x.posts",
        description="X/Twitter post collection and profile-based post discovery results.",
        model="XPostPayload",
        endpoints=[
            "X - posts by URL",
            "X - posts by profiles array",
            "X - most recent posts by profile URL",
        ],
    ),
    BrightDataDatasetKey(
        key="brightdata.error",
        description="Bright Data crawler error records returned when include_errors=true.",
        model="BrightDataErrorPayload",
        endpoints=["Any Bright Data endpoint with include_errors=true"],
    ),
]


def get_schema_registry() -> dict[str, Any]:
    from backend.brightdata.endpoints import get_endpoint_registry

    return {
        "datasets": [item.model_dump() for item in BRIGHTDATA_DATASET_KEYS],
        "endpointRegistry": get_endpoint_registry(),
        "schemas": {
            key: model.model_json_schema()
            for key, model in BRIGHTDATA_SCHEMA_REGISTRY.items()
        },
    }
