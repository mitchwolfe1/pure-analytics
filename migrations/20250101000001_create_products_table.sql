CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    pure_product_id VARCHAR(255) NOT NULL,
    pure_variant_id VARCHAR(255) NOT NULL,
    name VARCHAR(500) NOT NULL,
    sku VARCHAR(255) NOT NULL,
    material VARCHAR(100) NOT NULL,
    variant_label VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(pure_product_id, pure_variant_id)
);

CREATE INDEX IF NOT EXISTS idx_products_pure_ids ON products(pure_product_id, pure_variant_id);
