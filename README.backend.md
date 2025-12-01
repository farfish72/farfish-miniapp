# FarFISH Backend API Documentation

## Overview

This document describes the backend API endpoints and infrastructure for the FarFISH miniapp.

## Architecture

- **Framework**: Next.js 14 App Router
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Service-role key for server-side operations
- **API Routes**: RESTful endpoints under `/api`

## Environment Variables

See `.env.example` for required environment variables. Key variables:

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Server-only key with full database access
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Public anonymous key for client-side queries
- `RUN_MIGRATIONS`: Set to "yes" to enable automatic migrations (not recommended for production)

## Database Schema

### Tables

#### `profiles`
- `wallet_address` (TEXT, PRIMARY KEY)
- `fid` (INTEGER, nullable)
- `display_name` (TEXT, nullable)
- `pfp_url` (TEXT, nullable)
- `last_daily_claim_at` (BIGINT, nullable)
- `daily_claim_count` (INTEGER, default 0)
- `monthly_claim_total` (INTEGER, default 0)
- `referrals_completed` (INTEGER, default 0)
- `referred_by` (TEXT, nullable)
- `streak_days` (INTEGER, nullable)
- `rank_label` (TEXT, nullable)
- `updated_at` (TIMESTAMP)

#### `staking_positions`
- `wallet_address` (TEXT)
- `token_id` (INTEGER)
- `token_tier` (INTEGER, default 0)
- `lock_days` (INTEGER)
- `staked_at` (BIGINT)
- `image_url` (TEXT, nullable)
- `updated_at` (TIMESTAMP)
- PRIMARY KEY: (`wallet_address`, `token_id`)

## API Endpoints

### POST /api/daily-claim

Records a daily claim for a user. Enforces a 24-hour cooldown.

**Request Body:**
```json
{
  "walletAddress": "0x1234..."
}
```

**Response (200):**
```json
{
  "success": true,
  "dailyClaimCount": 5,
  "monthlyClaimTotal": 12,
  "nextClaimAt": 1234567890123
}
```

**Response (403 - Cooldown active):**
```json
{
  "error": "Daily claim cooldown active",
  "remainingHours": 8,
  "nextClaimAt": 1234567890123
}
```

### POST /api/staked/record

Records or updates a staking position.

**Request Body:**
```json
{
  "walletAddress": "0x1234...",
  "tokenId": 123,
  "tokenTier": 1,
  "lockDays": 90,
  "imageUrl": "https://..." // optional
}
```

**Response (200):**
```json
{
  "success": true,
  "stakingPosition": {
    "walletAddress": "0x1234...",
    "tokenId": 123,
    "tokenTier": 1,
    "lockDays": 90,
    "stakedAt": 1234567890123,
    "unlockAt": 1234567890123
  }
}
```

**Valid `lockDays` values:** 30, 90, 180, 360

### POST /api/referral/record

Records a referral relationship between two users.

**Request Body:**
```json
{
  "walletAddress": "0x1234...",
  "referredBy": "12345" // FID or wallet address
}
```

**Response (200):**
```json
{
  "success": true,
  "walletAddress": "0x1234...",
  "referredBy": "12345"
}
```

**Notes:**
- Idempotent: If referral already exists, returns success
- Automatically increments referrer's `referrals_completed` count
- Searches for referrer by wallet address or FID

## Database Functions (RPCs)

The migration file `migrations/001_rpcs.sql` creates three PostgreSQL functions:

1. `record_daily_claim(p_wallet_address TEXT)` - Server-side daily claim handler
2. `record_staking_position(...)` - Server-side staking position handler
3. `record_referral(...)` - Server-side referral handler

These functions can be called directly from Supabase or via the API routes.

## Migration Instructions

### Running Migrations

1. **Backup your database** (IMPORTANT)

2. **Review the migration file**: `migrations/001_rpcs.sql`

3. **Run the migration**:
   - Via Supabase Dashboard: SQL Editor → Paste migration → Run
   - Via CLI: `psql` or Supabase CLI
   - Via API: Use service-role key to execute SQL

4. **Verify functions exist**:
   ```sql
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_schema = 'public' 
   AND routine_name LIKE 'record_%';
   ```

### Rollback Instructions

To rollback the migration:

```sql
BEGIN;
DROP FUNCTION IF EXISTS record_daily_claim(TEXT);
DROP FUNCTION IF EXISTS record_staking_position(TEXT, INTEGER, INTEGER, INTEGER, TEXT);
DROP FUNCTION IF EXISTS record_referral(TEXT, TEXT);
COMMIT;
```

## Testing

### Manual Testing

Use `curl` or Postman to test endpoints:

```bash
# Daily claim
curl -X POST http://localhost:3000/api/daily-claim \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "0x1234..."}'

# Record staking
curl -X POST http://localhost:3000/api/staked/record \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "0x1234...", "tokenId": 123, "lockDays": 90}'

# Record referral
curl -X POST http://localhost:3000/api/referral/record \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "0x5678...", "referredBy": "12345"}'
```

### Automated Tests

Run the test suite (if configured):

```bash
npm test
```

## Security Considerations

1. **Service Role Key**: 
   - Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client
   - Only use in server-side code (API routes, server components)
   - Stored in `.env.local` (gitignored)

2. **Input Validation**:
   - All endpoints validate input before processing
   - Wallet addresses are normalized (lowercase, trimmed)
   - Invalid inputs return 400 Bad Request

3. **Error Handling**:
   - All errors are logged server-side
   - Client receives sanitized error messages
   - Sensitive information is never exposed

4. **Idempotency**:
   - Referral recording is idempotent (safe to call multiple times)
   - Staking positions use upsert (safe to update)

## Deployment

### Vercel

1. Set environment variables in Vercel dashboard
2. Deploy: `vercel --prod`
3. Verify endpoints are accessible

### Local Development

1. Copy `.env.example` to `.env.local`
2. Fill in Supabase credentials
3. Run: `npm run dev`
4. Test endpoints at `http://localhost:3000/api/*`

## Troubleshooting

### Migration Errors

- Check PostgreSQL version (requires 12+)
- Verify table schemas match expected structure
- Check for conflicting function names

### API Errors

- Verify environment variables are set
- Check Supabase connection
- Review server logs for detailed errors
- Ensure service-role key has correct permissions

## Support

For issues or questions:
- Check Supabase logs
- Review API route server logs
- Verify database schema matches documentation

