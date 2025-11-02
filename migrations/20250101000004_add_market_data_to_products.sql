ALTER TABLE products ADD COLUMN highest_offer_spot_premium DECIMAL(8, 4);
ALTER TABLE products ADD COLUMN lowest_listing_spot_premium DECIMAL(8, 4);
ALTER TABLE products ADD COLUMN market_data_updated_at TIMESTAMPTZ;
