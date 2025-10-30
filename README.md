# Pure Trading - Bullion Marketplace Transaction Database

A Rust-based system for ingesting and serving bullion marketplace transaction data from Pure.

## Project Structure

```
pure-trading/
├── common/           # Shared models and database code
├── ingestion/        # Data ingestion service
├── api/              # REST API service
└── migrations/       # Database migrations
```

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

## Quick Start with Docker

The easiest way to run the entire stack:

```bash
# Build and start all services (Postgres, Ingestion, API)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes (deletes database)
docker-compose down -v
```

The API will be available at `http://localhost:3000`

## Local Development Setup

1. **Prerequisites**
   - Rust (latest stable)
   - PostgreSQL

2. **Database Setup**
   ```bash
   # Create database
   createdb pure_trading
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Build**
   ```bash
   cargo build
   ```

5. **Run Migrations**
   Migrations run automatically when starting the ingestion service.

## Services

### Ingestion Service
Fetches data from Pure marketplace endpoints and stores in the database.

```bash
cargo run --bin ingestion
```

### API Service
Provides REST API endpoints for accessing transaction data.

```bash
cargo run --bin api
```

The API runs on port 3000 by default (configurable via PORT env var).

Health check: `GET /health`

## Development

This is a Cargo workspace with three crates:
- `common`: Shared database models
- `ingestion`: Data ingestion service
- `api`: REST API service
