mod config;
mod pure_api;
mod retry;

use anyhow::Result;
use chrono::DateTime;
use common::{NewProduct, NewTransaction, Product};
use config::Config;
use pure_api::{ActivityEvent, PureApiClient};
use sqlx::{PgPool, postgres::PgPoolOptions};
use tokio::time::interval;
use tracing::{info, error, warn};

/// Parses an activity event into a transaction record
fn parse_activity_to_transaction(
    event: ActivityEvent,
    product: &Product,
) -> Result<NewTransaction> {
    let event_time = DateTime::parse_from_str(&event.created_at, "%Y-%m-%d %H:%M:%S%.f%#z")?;

    Ok(NewTransaction {
        product_id: product.id,
        pure_product_id: product.pure_product_id.clone(),
        pure_variant_id: product.pure_variant_id.clone(),
        price: event.price,
        quantity: event.quantity,
        spot_premium_percentage: event.spot_premium,
        spot_premium_dollar: event.spot_premium_dollar,
        event_time: event_time.with_timezone(&chrono::Utc),
    })
}

/// Fetches transactions for a single product
async fn fetch_transactions_for_product(
    client: &PureApiClient,
    product: &Product,
) -> Result<Vec<NewTransaction>> {
    let events = client.fetch_product_activity(
        &product.pure_product_id,
        &product.pure_variant_id
    ).await?;

    let mut transactions = Vec::new();
    for event in events {
        match parse_activity_to_transaction(event, product) {
            Ok(transaction) => transactions.push(transaction),
            Err(e) => {
                warn!(
                    "Failed to parse transaction for product {}, variant {}: {}",
                    product.pure_product_id, product.pure_variant_id, e
                );
            }
        }
    }

    Ok(transactions)
}

/// Fetches all products from the database
async fn fetch_all_products(pool: &PgPool) -> Result<Vec<Product>> {
    Ok(sqlx::query_as::<_, Product>("SELECT * FROM products")
        .fetch_all(pool)
        .await?)
}

async fn upsert_products(pool: &PgPool, products: &[NewProduct]) -> Result<()> {
    info!("Upserting {} products into database", products.len());

    let mut upserted = 0;

    for product in products {
        let result = sqlx::query(
            r#"
            INSERT INTO products (pure_product_id, pure_variant_id, name, sku, material, variant_label, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            ON CONFLICT (pure_product_id, pure_variant_id)
            DO UPDATE SET
                name = EXCLUDED.name,
                sku = EXCLUDED.sku,
                material = EXCLUDED.material,
                variant_label = EXCLUDED.variant_label,
                updated_at = NOW()
            "#
        )
        .bind(&product.pure_product_id)
        .bind(&product.pure_variant_id)
        .bind(&product.name)
        .bind(&product.sku)
        .bind(&product.material)
        .bind(&product.variant_label)
        .execute(pool)
        .await?;

        if result.rows_affected() > 0 {
            // Note: Can't easily distinguish between insert and update with ON CONFLICT
            // but we know something happened
            upserted += 1;
        }
    }

    info!("Successfully upserted {} products", upserted);

    Ok(())
}

async fn upsert_transactions_batch(pool: &PgPool, transactions: &[NewTransaction]) -> Result<()> {
    if transactions.is_empty() {
        return Ok(());
    }

    info!("Upserting {} transactions into database", transactions.len());

    let mut upserted = 0;

    for transaction in transactions {
        let result = sqlx::query(
            r#"
            INSERT INTO transactions (product_id, pure_product_id, pure_variant_id, price, quantity, spot_premium_percentage, spot_premium_dollar, event_time, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
            ON CONFLICT (event_time, pure_product_id, pure_variant_id)
            DO UPDATE SET
                product_id = EXCLUDED.product_id,
                price = EXCLUDED.price,
                quantity = EXCLUDED.quantity,
                spot_premium_percentage = EXCLUDED.spot_premium_percentage,
                spot_premium_dollar = EXCLUDED.spot_premium_dollar,
                updated_at = NOW()
            "#
        )
        .bind(transaction.product_id)
        .bind(&transaction.pure_product_id)
        .bind(&transaction.pure_variant_id)
        .bind(transaction.price)
        .bind(transaction.quantity)
        .bind(transaction.spot_premium_percentage)
        .bind(transaction.spot_premium_dollar)
        .bind(transaction.event_time)
        .execute(pool)
        .await?;

        if result.rows_affected() > 0 {
            upserted += 1;
        }
    }

    info!("Successfully upserted {} transactions", upserted);

    Ok(())
}

/// Syncs transactions for all products, inserting immediately after each fetch
async fn sync_transactions(
    pool: &PgPool,
    client: &PureApiClient,
) -> Result<()> {
    info!("Starting transaction sync");

    let products = fetch_all_products(pool).await?;
    info!("Fetching transactions for {} products", products.len());

    let mut total_transactions = 0;
    let total_products = products.len();

    for (index, product) in products.iter().enumerate() {
        info!(
            "[{}/{}] Fetching activity for product: {}, variant: {}",
            index + 1, total_products, product.pure_product_id, product.pure_variant_id
        );

        match fetch_transactions_for_product(client, product).await {
            Ok(transactions) => {
                let count = transactions.len();
                info!(
                    "[{}/{}] Success - Found {} transactions",
                    index + 1, total_products, count
                );

                // Insert immediately if we have transactions
                if !transactions.is_empty() {
                    match upsert_transactions_batch(pool, &transactions).await {
                        Ok(_) => {
                            total_transactions += count;
                        }
                        Err(e) => {
                            error!("Failed to upsert transactions: {}", e);
                        }
                    }
                }
            }
            Err(e) => {
                error!("[{}/{}] Failed - {}", index + 1, total_products, e);
            }
        }
    }

    info!(
        "Completed fetching transactions. Total: {} transactions from {} products",
        total_transactions, total_products
    );

    Ok(())
}

/// Syncs products from the API to the database
async fn sync_products(pool: &PgPool, client: &PureApiClient) -> Result<()> {
    info!("Starting product sync");

    match client.build_new_products().await {
        Ok(products) => {
            info!("Built {} products ready for insertion", products.len());

            match upsert_products(pool, &products).await {
                Ok(_) => {
                    info!("Product sync completed successfully");
                    Ok(())
                }
                Err(e) => {
                    error!("Failed to upsert products: {}", e);
                    Err(e)
                }
            }
        }
        Err(e) => {
            error!("Failed to build products: {}", e);
            Err(e)
        }
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();
    dotenvy::dotenv().ok();

    info!("Starting Pure Trading ingestion service");

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
    sqlx::migrate!("../migrations")
        .run(&pool)
        .await?;

    info!("Database migrations completed");

    // Initialize Pure API client
    let pure_client = PureApiClient::new(&config)?;

    // Start sync intervals
    let mut product_sync_interval = interval(config.product_sync_interval);
    let mut transaction_sync_interval = interval(config.transaction_sync_interval);

    info!("Ingestion service ready - starting sync loops");

    loop {
        tokio::select! {
            _ = product_sync_interval.tick() => {
                if let Err(e) = sync_products(&pool, &pure_client).await {
                    error!("Product sync failed: {}", e);
                }
            }
            _ = transaction_sync_interval.tick() => {
                if let Err(e) = sync_transactions(&pool, &pure_client).await {
                    error!("Transaction sync failed: {}", e);
                }
            }
            _ = tokio::signal::ctrl_c() => {
                info!("Shutting down ingestion service");
                break;
            }
        }
    }

    Ok(())
}
