use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Transaction {
    pub id: i64,
    pub product_id: i64,
    pub pure_product_id: String,
    pub pure_variant_id: String,
    pub price: f64,
    pub quantity: i32,
    pub spot_premium_percentage: f64,
    pub spot_premium_dollar: f64,
    pub event_time: DateTime<Utc>,
    pub event_type: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Product {
    pub id: i64,
    pub pure_product_id: String,
    pub pure_variant_id: String,
    pub name: String,
    pub sku: String,
    pub material: String,
    pub variant_label: String,
    pub image_url: Option<String>,
    pub highest_offer_spot_premium: Option<f64>,
    pub lowest_listing_spot_premium: Option<f64>,
    pub market_data_updated_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// Struct for inserting new products (without auto-generated fields)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewProduct {
    pub pure_product_id: String,
    pub pure_variant_id: String,
    pub name: String,
    pub sku: String,
    pub material: String,
    pub variant_label: String,
    pub image_url: Option<String>,
    pub highest_offer_spot_premium: Option<f64>,
    pub lowest_listing_spot_premium: Option<f64>,
    pub market_data_updated_at: Option<DateTime<Utc>>,
}

// Struct for inserting new transactions (without auto-generated fields)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewTransaction {
    pub product_id: i64,
    pub pure_product_id: String,
    pub pure_variant_id: String,
    pub price: f64,
    pub quantity: i32,
    pub spot_premium_percentage: f64,
    pub spot_premium_dollar: f64,
    pub event_time: DateTime<Utc>,
    pub event_type: Option<String>,
}
