use anyhow::Result;
use common::NewProduct;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use tracing::info;

use crate::config::Config;
use crate::retry::{with_retry_and_rate_limit, RetryConfig};

const PRODUCT_OPTIONS_PATH: &str = "/products/get-product-options/v1";
const GET_PRODUCTS_PATH: &str = "/products/get-products/v1";
const PRODUCT_ACTIVITY_PATH: &str = "/products/get-product-activity/v1";

// API Response structures
#[derive(Debug, Deserialize)]
pub struct ProductOptionsResponse {
    pub data: Vec<ProductOption>,
}

#[derive(Debug, Deserialize)]
pub struct ProductOption {
    pub value: String,  // pure_product_id
    pub label: String,
    pub variants: Vec<VariantOption>,
}

#[derive(Debug, Deserialize)]
pub struct VariantOption {
    pub value: String,  // pure_variant_id
    pub label: String,
}

// Flattened structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlattenedProductVariant {
    pub pure_product_id: String,
    pub pure_variant_id: String,
    pub pure_variant_label: String,
}

// Get Products API Response structures
#[derive(Debug, Deserialize)]
pub struct ProductsResponse {
    pub data: Vec<ProductData>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductData {
    pub id: String,
    pub title: String,
    pub sku: String,
    pub material: String,
    pub variants: Vec<VariantData>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VariantData {
    pub title: String,
    pub highest_offer: Option<MarketData>,
    pub lowest_listing: Option<MarketData>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MarketData {
    pub spot_premium: f64,
}

// Product Activity API Response structures
#[derive(Debug, Deserialize)]
pub struct ProductActivityResponse {
    pub data: Vec<ActivityEvent>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityEvent {
    pub event: String,
    pub created_at: String,  // Will parse this to DateTime
    pub price: f64,
    pub quantity: i32,
    pub spot_premium: f64,
    pub spot_premium_dollar: f64,
}

pub struct PureApiClient {
    client: Client,
    api_key: String,
    api_base_url: String,
    retry_config: RetryConfig,
    product_batch_size: usize,
}

impl PureApiClient {
    pub fn new(config: &Config) -> Result<Self> {
        let client = Client::builder().build()?;

        let retry_config = RetryConfig {
            max_retries: config.max_retries,
            initial_backoff: config.initial_backoff,
            rate_limit_delay: config.rate_limit_delay,
        };

        Ok(Self {
            client,
            api_key: config.pure_api_key.clone(),
            api_base_url: config.api_base_url.clone(),
            retry_config,
            product_batch_size: config.product_batch_size,
        })
    }

    /// Fetches product options from the API (without retry wrapper since it's a simple call)
    async fn fetch_product_options_raw(&self) -> Result<ProductOptionsResponse> {
        let url = format!("{}{}", self.api_base_url, PRODUCT_OPTIONS_PATH);
        let response = self.client
            .get(&url)
            .header("x-api-key", &self.api_key)
            .send()
            .await?;

        let status = response.status();
        if !status.is_success() {
            let body = response.text().await?;
            return Err(anyhow::anyhow!("API request failed with status {}: {}", status, body));
        }

        Ok(response.json().await?)
    }

    /// Fetches product options and flattens variants
    pub async fn fetch_and_flatten_variants(&self) -> Result<Vec<FlattenedProductVariant>> {
        info!("Fetching product options from Pure API");

        let product_options = with_retry_and_rate_limit(
            || self.fetch_product_options_raw(),
            &self.retry_config,
            "Fetch product options"
        ).await?;

        let flattened: Vec<FlattenedProductVariant> = product_options.data
            .into_iter()
            .flat_map(|product| {
                product.variants.into_iter().map(move |variant| {
                    FlattenedProductVariant {
                        pure_product_id: product.value.clone(),
                        pure_variant_id: variant.value,
                        pure_variant_label: variant.label,
                    }
                })
            })
            .collect();

        info!("Successfully fetched and flattened {} product variants", flattened.len());
        Ok(flattened)
    }

    /// Extracts unique product IDs from variants
    pub fn deduplicate_product_ids(variants: &[FlattenedProductVariant]) -> Vec<String> {
        variants
            .iter()
            .map(|v| v.pure_product_id.clone())
            .collect::<HashSet<_>>()
            .into_iter()
            .collect()
    }

    /// Fetches a batch of products from the API
    async fn fetch_products_batch_raw(&self, product_ids: &[String]) -> Result<Vec<ProductData>> {
        let ids_param = product_ids.join(",");
        let url = format!("{}{}", self.api_base_url, GET_PRODUCTS_PATH);

        let response = self.client
            .get(&url)
            .header("x-api-key", &self.api_key)
            .query(&[("ids", ids_param)])
            .send()
            .await?;

        let status = response.status();
        if !status.is_success() {
            let body = response.text().await?;
            return Err(anyhow::anyhow!("API request failed with status {}: {}", status, body));
        }

        let products_response: ProductsResponse = response.json().await?;
        Ok(products_response.data)
    }

    /// Fetches products in batches with progress logging
    pub async fn fetch_products_in_batches(&self, product_ids: &[String]) -> Result<Vec<ProductData>> {
        info!("Fetching {} products in batches of {}", product_ids.len(), self.product_batch_size);

        let mut all_products = Vec::new();
        let total_batches = (product_ids.len() + self.product_batch_size - 1) / self.product_batch_size;

        for (batch_index, chunk) in product_ids.chunks(self.product_batch_size).enumerate() {
            let batch_num = batch_index + 1;
            let context = format!("Fetch products batch {}/{}", batch_num, total_batches);

            info!("[{}/{}] Fetching batch of {} products", batch_num, total_batches, chunk.len());

            match with_retry_and_rate_limit(
                || self.fetch_products_batch_raw(chunk),
                &self.retry_config,
                &context
            ).await {
                Ok(products) => {
                    info!("[{}/{}] Successfully fetched {} products", batch_num, total_batches, products.len());
                    all_products.extend(products);
                }
                Err(e) => {
                    info!("[{}/{}] Failed to fetch batch: {}", batch_num, total_batches, e);
                    // Continue with other batches instead of failing completely
                }
            }
        }

        info!("Successfully fetched {} out of {} products", all_products.len(), product_ids.len());
        Ok(all_products)
    }

    /// Builds a HashMap of product ID to ProductData
    pub fn build_product_map(products: Vec<ProductData>) -> HashMap<String, ProductData> {
        products.into_iter()
            .map(|product| (product.id.clone(), product))
            .collect()
    }

    /// Combines variants with product details to create NewProduct records
    pub fn combine_variants_with_products(
        variants: Vec<FlattenedProductVariant>,
        product_map: &HashMap<String, ProductData>
    ) -> Vec<NewProduct> {
        variants
            .into_iter()
            .filter_map(|variant| {
                product_map.get(&variant.pure_product_id).map(|product| {
                    // Find the matching variant by title to get market data
                    let (highest_offer_premium, lowest_listing_premium) = product.variants
                        .iter()
                        .find(|v| v.title == variant.pure_variant_label)
                        .map(|v| {
                            let highest = v.highest_offer.as_ref().map(|o| o.spot_premium);
                            let lowest = v.lowest_listing.as_ref().map(|l| l.spot_premium);
                            (highest, lowest)
                        })
                        .unwrap_or((None, None));

                    NewProduct {
                        pure_product_id: variant.pure_product_id,
                        pure_variant_id: variant.pure_variant_id,
                        name: product.title.clone(),
                        sku: product.sku.clone(),
                        material: product.material.clone(),
                        variant_label: variant.pure_variant_label,
                        highest_offer_spot_premium: highest_offer_premium,
                        lowest_listing_spot_premium: lowest_listing_premium,
                        market_data_updated_at: Some(chrono::Utc::now()),
                    }
                })
            })
            .collect()
    }

    /// Orchestrates the full product building pipeline
    pub async fn build_new_products(&self) -> Result<Vec<NewProduct>> {
        // Step 1: Fetch and flatten variants
        let variants = self.fetch_and_flatten_variants().await?;

        // Step 2: Extract unique product IDs
        let product_ids = Self::deduplicate_product_ids(&variants);
        info!("Found {} unique products to fetch", product_ids.len());

        // Step 3: Fetch product details in batches
        let products = self.fetch_products_in_batches(&product_ids).await?;

        // Step 4: Build product map
        let product_map = Self::build_product_map(products);

        // Step 5: Combine variants with product details
        let new_products = Self::combine_variants_with_products(variants, &product_map);
        info!("Built {} NewProduct models", new_products.len());

        Ok(new_products)
    }

    /// Fetches product activity for a specific product/variant
    async fn fetch_product_activity_raw(
        &self,
        product_id: &str,
        variant_id: &str,
    ) -> Result<Vec<ActivityEvent>> {
        let url = format!("{}{}", self.api_base_url, PRODUCT_ACTIVITY_PATH);
        let response = self.client
            .get(&url)
            .header("x-api-key", &self.api_key)
            .query(&[("productId", product_id), ("variantId", variant_id)])
            .send()
            .await?;

        let status = response.status();
        if !status.is_success() {
            let body = response.text().await?;
            return Err(anyhow::anyhow!("API request failed with status {}: {}", status, body));
        }

        let activity_response: ProductActivityResponse = response.json().await?;
        Ok(activity_response.data)
    }

    /// Fetches product activity with retry and rate limiting
    pub async fn fetch_product_activity(
        &self,
        product_id: &str,
        variant_id: &str,
    ) -> Result<Vec<ActivityEvent>> {
        let context = format!("Fetch activity for product: {}, variant: {}", product_id, variant_id);

        with_retry_and_rate_limit(
            || self.fetch_product_activity_raw(product_id, variant_id),
            &self.retry_config,
            &context
        ).await
    }
}
