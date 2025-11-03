ALTER TABLE products DROP COLUMN IF EXISTS highest_offer_spot_premium;
ALTER TABLE products DROP COLUMN IF EXISTS lowest_listing_spot_premium;
ALTER TABLE products DROP COLUMN IF EXISTS market_data_updated_at;

ALTER TABLE products ADD COLUMN highest_offer_spot_premium DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN lowest_listing_spot_premium DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN market_data_updated_at TIMESTAMPTZ;
