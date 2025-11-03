# Pure Analytics

Real-time analytics platform for bullion marketplace transaction data from Pure.

**Live:** https://pure-analytics-web.fly.dev

## Features

- **Transaction History** - Browse all marketplace transactions with filtering and sorting
- **Product Stats** - Aggregated metrics including buy/sell ratios, volumes, and transaction counts
- **Product Details** - View detailed transaction history for specific products and variants
- **Market Data** - Real-time highest offers and lowest listings with spot premiums

## Architecture

```
pure-analytics/
├── api/              # Rust REST API (Axum) with request logging
├── ingestion/        # Data ingestion service (syncs every 5 minutes)
│   └── bin/          # Backfill utilities (event types, image URLs)
├── common/           # Shared Rust models
├── web/              # React + TypeScript frontend (Vite)
└── migrations/       # PostgreSQL schema migrations
```

**Stack:** Rust (Axum, SQLx), React, TypeScript, PostgreSQL, Fly.io

## API Endpoints

- `GET /health` - Health check
- `GET /transactions` - List all transactions with product details
- `GET /products/stats` - Aggregated product statistics
- `GET /product/:product_id` - Detailed product and transaction history

## Database Schema

### Products Table

- `id` - Primary key
- `pure_product_id` - Product ID from Pure marketplace
- `pure_variant_id` - Variant ID from Pure marketplace
- `name` - Product name
- `sku` - Stock keeping unit
- `material` - Material type (e.g., gold, silver, platinum, palladium)
- `variant_label` - Product variant description
- `image_url` - Product image URL (nullable)
- `highest_offer_spot_premium` - Current highest buy offer premium (nullable)
- `lowest_listing_spot_premium` - Current lowest sell listing premium (nullable)
- `market_data_updated_at` - Last market data sync timestamp
- `created_at` - Timestamp
- `updated_at` - Timestamp

Unique constraint: `(pure_product_id, pure_variant_id)`

### Transactions Table

- `id` - Primary key
- `product_id` - Foreign key to products table
- `pure_product_id` - Product ID from Pure marketplace
- `pure_variant_id` - Variant ID from Pure marketplace
- `price` - Transaction price (in cents)
- `quantity` - Quantity traded
- `spot_premium_percentage` - Premium over spot as percentage
- `spot_premium_dollar` - Premium over spot in dollars (in cents)
- `event_type` - Transaction type: 'buy' or 'sell' (nullable)
- `event_time` - When the transaction occurred
- `created_at` - Timestamp
- `updated_at` - Timestamp

Unique constraint: `(pure_product_id, pure_variant_id, event_time)`

## Local Development

```bash
# Start all services (API, web, database)
docker-compose up -d

# Run database migrations
docker-compose exec api sqlx migrate run

# Run ingestion service manually
docker-compose exec api /app/ingestion
```

- **API**: http://localhost:3000
- **Web**: http://localhost:5173
- **Database**: localhost:5432

## Backfill Scripts

The project includes utility scripts for one-time data backfills:

```bash
# Backfill event types (classify transactions as buy/sell)
docker-compose exec api /app/backfill_event_types

# Backfill product image URLs
docker-compose exec api /app/backfill_image_urls
```

## Deployment

```bash
# Deploy API to Fly.io
flyctl deploy --config fly.api.toml

# Deploy Web to Fly.io
cd web && flyctl deploy
```

## Environment Variables

### API & Ingestion

- `DATABASE_URL` - PostgreSQL connection string
- `PURE_API_KEY` - Pure marketplace API key
