use anyhow::Result;
use axum::{
    routing::get,
    Router,
    Json,
    extract::State,
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
    name: String,
    sku: String,
    material: String,
    event_time: DateTime<Utc>,
    quantity: i32,
    price: f64,
    spot_premium_percentage: f64,
    spot_premium_dollar: f64,
}

#[derive(Debug, Serialize)]
struct TransactionsResponse {
    transactions: Vec<TransactionWithProduct>,
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
            p.name,
            p.sku,
            p.material,
            t.event_time,
            t.quantity,
            t.price::FLOAT8 as price,
            t.spot_premium_percentage::FLOAT8 as spot_premium_percentage,
            t.spot_premium_dollar::FLOAT8 as spot_premium_dollar
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
