use anyhow::{Context, Result};
use std::time::Duration;

#[derive(Debug, Clone)]
pub struct Config {
    // Database configuration
    pub database_url: String,
    pub database_max_connections: u32,
    pub database_acquire_timeout: Duration,

    // API configuration
    pub pure_api_key: String,
    pub api_base_url: String,

    // Sync intervals
    pub product_sync_interval: Duration,
    pub transaction_sync_interval: Duration,

    // Rate limiting and retry configuration
    pub rate_limit_delay: Duration,
    pub max_retries: u32,
    pub initial_backoff: Duration,

    // Batch sizes
    pub product_batch_size: usize,
    pub transaction_insert_batch_size: usize,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        let database_url = std::env::var("DATABASE_URL")
            .context("DATABASE_URL must be set")?;

        let pure_api_key = std::env::var("PURE_API_KEY")
            .context("PURE_API_KEY must be set")?;

        // Optional configurations with defaults
        let database_max_connections = std::env::var("DATABASE_MAX_CONNECTIONS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(5);

        let database_acquire_timeout_secs = std::env::var("DATABASE_ACQUIRE_TIMEOUT_SECS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(3);

        let api_base_url = std::env::var("API_BASE_URL")
            .unwrap_or_else(|_| "https://api.collectpure.com".to_string());

        let product_sync_interval_secs = std::env::var("PRODUCT_SYNC_INTERVAL_SECS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(3600); // 1 hour

        let transaction_sync_interval_secs = std::env::var("TRANSACTION_SYNC_INTERVAL_SECS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(21600); // 6 hours

        let rate_limit_delay_secs = std::env::var("RATE_LIMIT_DELAY_SECS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(6);

        let max_retries = std::env::var("MAX_RETRIES")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(10);

        let initial_backoff_secs = std::env::var("INITIAL_BACKOFF_SECS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(6);

        let product_batch_size = std::env::var("PRODUCT_BATCH_SIZE")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(30);

        let transaction_insert_batch_size = std::env::var("TRANSACTION_INSERT_BATCH_SIZE")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(1000);

        Ok(Self {
            database_url,
            database_max_connections,
            database_acquire_timeout: Duration::from_secs(database_acquire_timeout_secs),
            pure_api_key,
            api_base_url,
            product_sync_interval: Duration::from_secs(product_sync_interval_secs),
            transaction_sync_interval: Duration::from_secs(transaction_sync_interval_secs),
            rate_limit_delay: Duration::from_secs(rate_limit_delay_secs),
            max_retries,
            initial_backoff: Duration::from_secs(initial_backoff_secs),
            product_batch_size,
            transaction_insert_batch_size,
        })
    }
}
