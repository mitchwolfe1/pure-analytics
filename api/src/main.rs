use anyhow::Result;
use axum::{
    routing::get,
    Router,
    Json,
    extract::{State, Path},
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sqlx::{PgPool, postgres::PgPoolOptions, FromRow};
use std::time::Duration;
use tower_http::cors::CorsLayer;
use tracing::info;

#[derive(Debug, Serialize, Deserialize, FromRow)]
struct TransactionWithProduct {
    pure_product_id: String,
    name: String,
    sku: String,
    material: String,
    variant_label: String,
    image_url: Option<String>,
    event_time: DateTime<Utc>,
    quantity: i32,
    price: f64,
    spot_premium_percentage: f64,
    spot_premium_dollar: f64,
    event_type: Option<String>,
}

#[derive(Debug, Serialize)]
struct TransactionsResponse {
    transactions: Vec<TransactionWithProduct>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
struct Product {
    name: String,
    sku: String,
    material: String,
    variant_label: String,
    image_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
struct ProductTransaction {
    sku: String,
    variant_label: String,
    event_time: DateTime<Utc>,
    quantity: i32,
    price: f64,
    spot_premium_percentage: f64,
    spot_premium_dollar: f64,
    event_type: Option<String>,
}

#[derive(Debug, Serialize)]
struct ProductDetailsResponse {
    variants: Vec<Product>,
    transactions: Vec<ProductTransaction>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
struct ProductStats {
    pure_product_id: String,
    material: String,
    name: String,
    sku: String,
    image_url: Option<String>,
    transaction_count: i64,
    buy_count: i64,
    sell_count: i64,
    buy_sell_ratio: Option<f64>,
    total_volume: Option<f64>,
    total_buy_quantity: Option<i64>,
    total_sell_quantity: Option<i64>,
    total_buy_amount: Option<f64>,
    total_sell_amount: Option<f64>,
}

#[derive(Debug, Serialize)]
struct ProductStatsResponse {
    products: Vec<ProductStats>,
}

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing
    tracing_subscriber::fmt::init();

    // Load environment variables
    dotenvy::dotenv().ok();

    info!("Starting Pure Trading API service");

    // Set up database connection pool
    let database_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .acquire_timeout(Duration::from_secs(3))
        .connect(&database_url)
        .await?;

    info!("Database connection established");

    // Build application router
    let app = Router::new()
        .route("/health", get(health_check))
        .route("/transactions", get(get_transactions))
        .route("/products/stats", get(get_product_stats))
        .route("/product/:product_id", get(get_product))
        .layer(CorsLayer::permissive())
        .with_state(pool);

    // Get port from env or default to 3000
    let port = std::env::var("PORT")
        .unwrap_or_else(|_| "3000".to_string())
        .parse::<u16>()?;

    let addr = format!("0.0.0.0:{}", port);
    info!("API server listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health_check() -> Json<Value> {
    Json(json!({
        "status": "ok",
        "service": "pure-trading-api"
    }))
}

async fn get_transactions(State(pool): State<PgPool>) -> Json<TransactionsResponse> {
    let transactions = sqlx::query_as::<_, TransactionWithProduct>(
        r#"
        SELECT
            p.pure_product_id,
            p.name,
            p.sku,
            p.material,
            p.variant_label,
            p.image_url,
            t.event_time,
            t.quantity,
            t.price::FLOAT8 as price,
            t.spot_premium_percentage::FLOAT8 as spot_premium_percentage,
            t.spot_premium_dollar::FLOAT8 as spot_premium_dollar,
            t.event_type
        FROM transactions t
        INNER JOIN products p ON t.product_id = p.id
        ORDER BY t.event_time DESC
        "#
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_else(|e| {
        tracing::error!("Failed to fetch transactions: {}", e);
        Vec::new()
    });

    Json(TransactionsResponse { transactions })
}

async fn get_product(
    State(pool): State<PgPool>,
    Path(product_id): Path<String>,
) -> Json<ProductDetailsResponse> {
    // Fetch all variants for this product
    let variants = sqlx::query_as::<_, Product>(
        r#"
        SELECT
            name,
            sku,
            material,
            variant_label,
            image_url
        FROM products
        WHERE pure_product_id = $1
        ORDER BY variant_label
        "#
    )
    .bind(&product_id)
    .fetch_all(&pool)
    .await
    .unwrap_or_else(|e| {
        tracing::error!("Failed to fetch product variants for {}: {}", product_id, e);
        Vec::new()
    });

    // Fetch all transactions for all variants of this product
    let transactions = sqlx::query_as::<_, ProductTransaction>(
        r#"
        SELECT
            p.sku,
            p.variant_label,
            t.event_time,
            t.quantity,
            t.price::FLOAT8 as price,
            t.spot_premium_percentage::FLOAT8 as spot_premium_percentage,
            t.spot_premium_dollar::FLOAT8 as spot_premium_dollar,
            t.event_type
        FROM transactions t
        INNER JOIN products p ON t.product_id = p.id
        WHERE p.pure_product_id = $1
        ORDER BY t.event_time DESC
        "#
    )
    .bind(&product_id)
    .fetch_all(&pool)
    .await
    .unwrap_or_else(|e| {
        tracing::error!("Failed to fetch transactions for product {}: {}", product_id, e);
        Vec::new()
    });

    Json(ProductDetailsResponse {
        variants,
        transactions,
    })
}

async fn get_product_stats(State(pool): State<PgPool>) -> Json<ProductStatsResponse> {
    let products = sqlx::query_as::<_, ProductStats>(
        r#"
        SELECT
            p.pure_product_id,
            p.material,
            p.name,
            MIN(p.sku) as sku,
            MIN(p.image_url) as image_url,
            COUNT(t.id) as transaction_count,
            COUNT(t.id) FILTER (WHERE t.event_type = 'buy') as buy_count,
            COUNT(t.id) FILTER (WHERE t.event_type = 'sell') as sell_count,
            CASE
                WHEN COUNT(t.id) FILTER (WHERE t.event_type = 'sell') > 0
                THEN (COUNT(t.id) FILTER (WHERE t.event_type = 'buy'))::FLOAT8 / (COUNT(t.id) FILTER (WHERE t.event_type = 'sell'))::FLOAT8
                ELSE NULL
            END as buy_sell_ratio,
            SUM(t.price * t.quantity)::FLOAT8 as total_volume,
            SUM(t.quantity) FILTER (WHERE t.event_type = 'buy') as total_buy_quantity,
            SUM(t.quantity) FILTER (WHERE t.event_type = 'sell') as total_sell_quantity,
            SUM(t.price * t.quantity) FILTER (WHERE t.event_type = 'buy')::FLOAT8 as total_buy_amount,
            SUM(t.price * t.quantity) FILTER (WHERE t.event_type = 'sell')::FLOAT8 as total_sell_amount
        FROM products p
        LEFT JOIN transactions t ON p.id = t.product_id
        GROUP BY p.pure_product_id, p.material, p.name
        ORDER BY total_volume DESC NULLS LAST
        "#
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_else(|e| {
        tracing::error!("Failed to fetch product stats: {}", e);
        Vec::new()
    });

    Json(ProductStatsResponse { products })
}
