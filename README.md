# Pure Analytics

Real-time analytics platform for bullion marketplace transaction data from Pure.

**Live:** https://pure-analytics-web.fly.dev

## Architecture

```
pure-analytics/
├── api/              # Rust REST API (Axum)
├── ingestion/        # Data ingestion service with retry logic and rate limiting
├── common/           # Shared models
├── web/              # React + TypeScript frontend (Vite)
└── migrations/       # PostgreSQL schema
```

**Stack:** Rust (Axum, SQLx), React, TypeScript, PostgreSQL, Fly.io

## Database Schema

### Products Table
- `id` - Primary key
- `pure_product_id` - Product ID from Pure marketplace
- `pure_variant_id` - Variant ID from Pure marketplace
- `name` - Product name
- `sku` - Stock keeping unit
- `material` - Material type (e.g., gold, silver)
- `created_at` - Timestamp
- `updated_at` - Timestamp

### Transactions Table
- `id` - Primary key
- `product_id` - Foreign key to products table
- `pure_product_id` - Product ID from Pure marketplace
- `pure_variant_id` - Variant ID from Pure marketplace
- `price` - Transaction price
- `quantity` - Quantity traded
- `spot_premium_percentage` - Premium over spot as percentage
- `spot_premium_dollar` - Premium over spot in dollars
- `event_time` - When the transaction occurred
- `created_at` - Timestamp
- `updated_at` - Timestamp

## Local Development

```bash
docker-compose up -d
```

API: http://localhost:3000
Web: http://localhost:5173

## Deployment

```bash
# API
flyctl deploy --config fly.api.toml

# Web
cd web && flyctl deploy
```

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `PURE_API_KEY` - Pure marketplace API key
