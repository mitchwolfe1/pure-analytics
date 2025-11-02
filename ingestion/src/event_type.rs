/// Determines the event type (buy/sell/unknown) based on spot premium comparison
///
/// Compares the transaction's spot premium to current market data:
/// - "buy" if transaction_premium is closer to lowest_listing_premium
/// - "sell" if transaction_premium is closer to highest_offer_premium
/// - "unknown" if market data is unavailable
pub fn determine_event_type(
    transaction_premium: f64,
    highest_offer_premium: Option<f64>,
    lowest_listing_premium: Option<f64>,
) -> String {
    match (highest_offer_premium, lowest_listing_premium) {
        (Some(offer), Some(listing)) => {
            let dist_to_offer = (transaction_premium - offer).abs();
            let dist_to_listing = (transaction_premium - listing).abs();
            if dist_to_listing < dist_to_offer {
                "buy".to_string()
            } else {
                "sell".to_string()
            }
        }
        _ => "unknown".to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_closer_to_listing_is_buy() {
        // Premium of 5.0 is closer to listing (6.0) than offer (2.0)
        assert_eq!(determine_event_type(5.0, Some(2.0), Some(6.0)), "buy");
    }

    #[test]
    fn test_closer_to_offer_is_sell() {
        // Premium of 3.0 is closer to offer (2.0) than listing (6.0)
        assert_eq!(determine_event_type(3.0, Some(2.0), Some(6.0)), "sell");
    }

    #[test]
    fn test_missing_offer() {
        assert_eq!(determine_event_type(5.0, None, Some(6.0)), "unknown");
    }

    #[test]
    fn test_missing_listing() {
        assert_eq!(determine_event_type(5.0, Some(2.0), None), "unknown");
    }

    #[test]
    fn test_both_missing() {
        assert_eq!(determine_event_type(5.0, None, None), "unknown");
    }
}
