-- TODO: Squash these migrations
ALTER TABLE products
  ALTER COLUMN highest_offer_spot_premium TYPE DOUBLE PRECISION USING highest_offer_spot_premium::DOUBLE PRECISION;

ALTER TABLE products
  ALTER COLUMN lowest_listing_spot_premium TYPE DOUBLE PRECISION USING lowest_listing_spot_premium::DOUBLE PRECISION;
