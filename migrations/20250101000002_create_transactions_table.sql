CREATE TABLE IF NOT EXISTS transactions (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    pure_product_id VARCHAR(255) NOT NULL,
    pure_variant_id VARCHAR(255) NOT NULL,
    price DECIMAL(12, 2) NOT NULL,
    quantity INTEGER NOT NULL,
    spot_premium_percentage DECIMAL(8, 4) NOT NULL,
    spot_premium_dollar DECIMAL(12, 2) NOT NULL,
    event_time TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(event_time, pure_product_id, pure_variant_id)
);

CREATE INDEX IF NOT EXISTS idx_transactions_product_id ON transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_transactions_event_time ON transactions(event_time DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_pure_ids ON transactions(pure_product_id, pure_variant_id);
