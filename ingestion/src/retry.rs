use anyhow::Result;
use std::future::Future;
use std::time::Duration;
use tokio::time::sleep;
use tracing::{info, error};

pub struct RetryConfig {
    pub max_retries: u32,
    pub initial_backoff: Duration,
    pub rate_limit_delay: Duration,
}

/// Executes an async operation with rate limiting and exponential backoff retry logic.
///
/// - Enforces a rate limit delay before each attempt
/// - Retries on all errors up to max_retries
/// - Uses exponential backoff starting from initial_backoff
///
/// # Arguments
/// * `operation` - A closure that returns a future producing a Result<T>
/// * `config` - Retry configuration (max retries, backoff, rate limit delay)
/// * `context` - Description of the operation for logging
pub async fn with_retry_and_rate_limit<F, Fut, T>(
    mut operation: F,
    config: &RetryConfig,
    context: &str,
) -> Result<T>
where
    F: FnMut() -> Fut,
    Fut: Future<Output = Result<T>>,
{
    let mut retry_count = 0;
    let mut backoff = config.initial_backoff;

    loop {
        // Enforce rate limiting before each attempt
        if retry_count > 0 {
            info!("{} - Waiting {} seconds before retry attempt {}/{}",
                  context, backoff.as_secs(), retry_count, config.max_retries);
            sleep(backoff).await;
        } else {
            // Always apply rate limit delay, even on first attempt
            sleep(config.rate_limit_delay).await;
        }

        match operation().await {
            Ok(result) => {
                if retry_count > 0 {
                    info!("{} - Success after {} retries", context, retry_count);
                }
                return Ok(result);
            }
            Err(e) => {
                if retry_count < config.max_retries {
                    error!("{} - Attempt {}/{} failed: {}. Retrying with exponential backoff...",
                           context, retry_count + 1, config.max_retries + 1, e);
                    retry_count += 1;
                    backoff *= 2; // Exponential backoff
                    continue;
                } else {
                    error!("{} - Failed after {} retries: {}", context, config.max_retries, e);
                    return Err(e);
                }
            }
        }
    }
}
