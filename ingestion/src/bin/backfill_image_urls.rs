use anyhow::Result;
use ingestion::config::Config;
use ingestion::pure_api::PureApiClient;
use sqlx::postgres::PgPoolOptions;
use tracing::{info, error};

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();
    dotenvy::dotenv().ok();

    info!("Starting image URL backfill");

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

    // Fetch fresh product data with images from Pure API
    info!("Fetching fresh product data with images from Pure API");
    match pure_client.build_new_products().await {
        Ok(products) => {
            info!("Fetched {} products with image data", products.len());

            // Update products table with image URLs
            info!("Updating products table with image URLs");
            let mut updated_count = 0;

            for (index, product) in products.iter().enumerate() {
                if (index + 1) % 100 == 0 {
                    info!("Progress: {}/{} products processed", index + 1, products.len());
                }

                let result = sqlx::query(
                    r#"
                    UPDATE products
                    SET image_url = $1,
                        updated_at = NOW()
                    WHERE pure_product_id = $2 AND pure_variant_id = $3
                    "#
                )
                .bind(&product.image_url)
                .bind(&product.pure_product_id)
                .bind(&product.pure_variant_id)
                .execute(&pool)
                .await?;

                if result.rows_affected() > 0 {
                    updated_count += 1;
                }
            }

            info!("Successfully updated {} products with image URLs", updated_count);
            info!("Products without images: {}", products.len() - updated_count);
        }
        Err(e) => {
            error!("Failed to fetch products from API: {}", e);
            return Err(e);
        }
    }

    info!("Image URL backfill completed!");

    Ok(())
}
