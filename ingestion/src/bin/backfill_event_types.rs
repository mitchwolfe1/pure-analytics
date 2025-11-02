use anyhow::Result;
use common::Product;
use ingestion::config::Config;
use ingestion::event_type;
use ingestion::pure_api::PureApiClient;
use sqlx::postgres::PgPoolOptions;
use tracing::{info, error};

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();
    dotenvy::dotenv().ok();

    info!("Starting event type backfill");

    // Load configuration
    let config = Config::from_env()?;
    info!("Configuration loaded successfully");

    // Create database connection pool
    let pool = PgPoolOptions::new()
        .max_connections(config.database_max_connections)
        .acquire_timeout(config.database_acquire_timeout)
        .connect(&config.database_url)
        .await?;

    info!("Database connection established");

    // Run migrations
    info!("Running database migrations");
    sqlx::migrate!("../migrations")
        .run(&pool)
        .await?;
    info!("Database migrations completed");

    // Initialize Pure API client
    let pure_client = PureApiClient::new(&config)?;

    // Step 1: Fetch fresh market data from API and update products table
    info!("Step 1: Fetching fresh market data from Pure API");
    match pure_client.build_new_products().await {
        Ok(products) => {
            info!("Fetched {} products with market data", products.len());

            // Update products table with market data
            info!("Updating products table with market data");
            for (index, product) in products.iter().enumerate() {
                if (index + 1) % 100 == 0 {
                    info!("Updated {}/{} products", index + 1, products.len());
                }

                sqlx::query(
                    r#"
                    UPDATE products
                    SET highest_offer_spot_premium = $1,
                        lowest_listing_spot_premium = $2,
                        market_data_updated_at = $3,
                        updated_at = NOW()
                    WHERE pure_product_id = $4 AND pure_variant_id = $5
                    "#
                )
                .bind(product.highest_offer_spot_premium)
                .bind(product.lowest_listing_spot_premium)
                .bind(product.market_data_updated_at)
                .bind(&product.pure_product_id)
                .bind(&product.pure_variant_id)
                .execute(&pool)
                .await?;
            }
            info!("Successfully updated {} products with market data", products.len());
        }
        Err(e) => {
            error!("Failed to fetch products from API: {}", e);
            return Err(e);
        }
    }

    // Step 2: Fetch all products from database (now with market data)
    info!("Step 2: Fetching products from database");
    let products = sqlx::query_as::<_, Product>("SELECT * FROM products")
        .fetch_all(&pool)
        .await?;
    info!("Fetched {} products from database", products.len());

    // Create a map of (pure_product_id, pure_variant_id) -> Product for quick lookup
    let mut product_map = std::collections::HashMap::new();
    for product in products {
        product_map.insert(
            (product.pure_product_id.clone(), product.pure_variant_id.clone()),
            product
        );
    }

    // Step 3: Fetch all transactions
    info!("Step 3: Fetching all transactions from database");
    let transaction_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM transactions")
        .fetch_one(&pool)
        .await?;
    info!("Found {} transactions to backfill", transaction_count);

    // Process transactions in batches
    let batch_size = 1000;
    let mut offset = 0;
    let mut updated_count = 0;

    loop {
        let transactions: Vec<(i64, String, String, f64)> = sqlx::query_as(
            r#"
            SELECT id, pure_product_id, pure_variant_id, spot_premium_percentage::FLOAT8
            FROM transactions
            ORDER BY id
            LIMIT $1 OFFSET $2
            "#
        )
        .bind(batch_size as i64)
        .bind(offset)
        .fetch_all(&pool)
        .await?;

        if transactions.is_empty() {
            break;
        }

        for (transaction_id, pure_product_id, pure_variant_id, spot_premium) in transactions {
            // Look up the product to get market data
            if let Some(product) = product_map.get(&(pure_product_id.clone(), pure_variant_id.clone())) {
                // Calculate event type
                let event_type = event_type::determine_event_type(
                    spot_premium,
                    product.highest_offer_spot_premium,
                    product.lowest_listing_spot_premium,
                );

                // Update transaction with event_type
                sqlx::query(
                    r#"
                    UPDATE transactions
                    SET event_type = $1, updated_at = NOW()
                    WHERE id = $2
                    "#
                )
                .bind(&event_type)
                .bind(transaction_id)
                .execute(&pool)
                .await?;

                updated_count += 1;
            } else {
                error!(
                    "Product not found for transaction {}: product_id={}, variant_id={}",
                    transaction_id, pure_product_id, pure_variant_id
                );
            }
        }

        offset += batch_size;
        info!("Progress: Updated {}/{} transactions", updated_count, transaction_count);
    }

    info!("Backfill completed! Updated {} transactions with event_type", updated_count);

    Ok(())
}
