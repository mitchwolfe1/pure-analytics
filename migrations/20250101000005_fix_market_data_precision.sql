-- Fix the precision of market data columns
ALTER TABLE products
  ALTER COLUMN highest_offer_spot_premium TYPE DOUBLE PRECISION,
  ALTER COLUMN lowest_listing_spot_premium TYPE DOUBLE PRECISION;
