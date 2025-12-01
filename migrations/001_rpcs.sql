-- Migration: 001_rpcs.sql
-- Description: Production-ready RPC functions for FarFISH backend
-- Safe to run multiple times (idempotent using CREATE OR REPLACE)

BEGIN;

-- ============================================================================
-- Function: record_daily_claim
-- Description: Records a daily claim for a user with cooldown validation
-- Parameters:
--   p_wallet_address TEXT - User's wallet address
-- Returns: JSON with success status and claim details
-- ============================================================================
CREATE OR REPLACE FUNCTION record_daily_claim(p_wallet_address TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile RECORD;
  v_last_claim_at BIGINT;
  v_now BIGINT;
  v_elapsed BIGINT;
  v_new_daily_count INTEGER;
  v_new_monthly_total INTEGER;
  v_day_ms BIGINT := 86400000; -- 24 hours in milliseconds
BEGIN
  -- Input validation
  IF p_wallet_address IS NULL OR LENGTH(TRIM(p_wallet_address)) < 10 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid wallet address'
    );
  END IF;

  v_now := EXTRACT(EPOCH FROM NOW()) * 1000; -- Current time in milliseconds
  p_wallet_address := LOWER(TRIM(p_wallet_address));

  -- Fetch or create profile
  SELECT last_daily_claim_at, daily_claim_count, monthly_claim_total
  INTO v_profile
  FROM profiles
  WHERE wallet_address = p_wallet_address;

  v_last_claim_at := COALESCE((v_profile.last_daily_claim_at)::BIGINT, 0);
  v_elapsed := v_now - v_last_claim_at;

  -- Validate cooldown (24 hours)
  IF v_last_claim_at > 0 AND v_elapsed < v_day_ms THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Daily claim cooldown active',
      'remainingHours', CEIL((v_day_ms - v_elapsed) / 3600000.0),
      'nextClaimAt', v_last_claim_at + v_day_ms
    );
  END IF;

  -- Calculate new values
  v_new_daily_count := COALESCE(v_profile.daily_claim_count, 0) + 1;
  v_new_monthly_total := COALESCE(v_profile.monthly_claim_total, 0) + 1;

  -- Update profile
  INSERT INTO profiles (
    wallet_address,
    last_daily_claim_at,
    daily_claim_count,
    monthly_claim_total,
    updated_at
  )
  VALUES (
    p_wallet_address,
    v_now,
    v_new_daily_count,
    v_new_monthly_total,
    NOW()
  )
  ON CONFLICT (wallet_address)
  DO UPDATE SET
    last_daily_claim_at = v_now,
    daily_claim_count = v_new_daily_count,
    monthly_claim_total = v_new_monthly_total,
    updated_at = NOW();

  RETURN json_build_object(
    'success', true,
    'dailyClaimCount', v_new_daily_count,
    'monthlyClaimTotal', v_new_monthly_total,
    'nextClaimAt', v_now + v_day_ms
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to record daily claim: ' || SQLERRM
    );
END;
$$;

-- ============================================================================
-- Function: record_staking_position
-- Description: Records or updates a staking position
-- Parameters:
--   p_wallet_address TEXT - User's wallet address
--   p_token_id INTEGER - NFT token ID
--   p_token_tier INTEGER - NFT tier (0-3)
--   p_lock_days INTEGER - Lock period (30, 90, 180, or 360)
--   p_image_url TEXT - Optional image URL
-- Returns: JSON with success status and position details
-- ============================================================================
CREATE OR REPLACE FUNCTION record_staking_position(
  p_wallet_address TEXT,
  p_token_id INTEGER,
  p_token_tier INTEGER DEFAULT 0,
  p_lock_days INTEGER,
  p_image_url TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staked_at BIGINT;
  v_unlock_at BIGINT;
  v_valid_lock_days INTEGER[] := ARRAY[30, 90, 180, 360];
BEGIN
  -- Input validation
  IF p_wallet_address IS NULL OR LENGTH(TRIM(p_wallet_address)) < 10 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid wallet address'
    );
  END IF;

  IF p_token_id IS NULL OR p_token_id < 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid token_id. Must be non-negative integer.'
    );
  END IF;

  IF p_lock_days IS NULL OR NOT (p_lock_days = ANY(v_valid_lock_days)) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid lock_days. Must be one of: 30, 90, 180, 360',
      'received', p_lock_days
    );
  END IF;

  p_wallet_address := LOWER(TRIM(p_wallet_address));
  v_staked_at := EXTRACT(EPOCH FROM NOW()) * 1000;
  v_unlock_at := v_staked_at + (p_lock_days * 86400000);

  -- Upsert staking position
  INSERT INTO staking_positions (
    wallet_address,
    token_id,
    token_tier,
    lock_days,
    staked_at,
    image_url,
    updated_at
  )
  VALUES (
    p_wallet_address,
    p_token_id,
    COALESCE(p_token_tier, 0),
    p_lock_days,
    v_staked_at,
    p_image_url,
    NOW()
  )
  ON CONFLICT (wallet_address, token_id)
  DO UPDATE SET
    token_tier = COALESCE(p_token_tier, staking_positions.token_tier),
    lock_days = p_lock_days,
    staked_at = v_staked_at,
    image_url = COALESCE(p_image_url, staking_positions.image_url),
    updated_at = NOW();

  RETURN json_build_object(
    'success', true,
    'walletAddress', p_wallet_address,
    'tokenId', p_token_id,
    'tokenTier', COALESCE(p_token_tier, 0),
    'lockDays', p_lock_days,
    'stakedAt', v_staked_at,
    'unlockAt', v_unlock_at
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to record staking position: ' || SQLERRM
    );
END;
$$;

-- ============================================================================
-- Function: record_referral
-- Description: Records a referral relationship between two users
-- Parameters:
--   p_wallet_address TEXT - New user's wallet address
--   p_referred_by TEXT - Referrer's FID or wallet address
-- Returns: JSON with success status
-- ============================================================================
CREATE OR REPLACE FUNCTION record_referral(
  p_wallet_address TEXT,
  p_referred_by TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_referred_by TEXT;
  v_referrer_record RECORD;
  v_new_count INTEGER;
BEGIN
  -- Input validation
  IF p_wallet_address IS NULL OR LENGTH(TRIM(p_wallet_address)) < 10 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid wallet address'
    );
  END IF;

  IF p_referred_by IS NULL OR LENGTH(TRIM(p_referred_by)) < 1 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid referred_by. Must be valid FID or wallet address.'
    );
  END IF;

  p_wallet_address := LOWER(TRIM(p_wallet_address));
  p_referred_by := LOWER(TRIM(p_referred_by));

  -- Check if referral already exists (idempotent)
  SELECT referred_by INTO v_existing_referred_by
  FROM profiles
  WHERE wallet_address = p_wallet_address;

  IF v_existing_referred_by IS NOT NULL THEN
    RETURN json_build_object(
      'success', true,
      'message', 'Referral already recorded',
      'referredBy', v_existing_referred_by
    );
  END IF;

  -- Update new user's profile with referrer
  INSERT INTO profiles (
    wallet_address,
    referred_by,
    updated_at
  )
  VALUES (
    p_wallet_address,
    p_referred_by,
    NOW()
  )
  ON CONFLICT (wallet_address)
  DO UPDATE SET
    referred_by = COALESCE(profiles.referred_by, EXCLUDED.referred_by),
    updated_at = NOW();

  -- Find referrer and increment count
  SELECT wallet_address, fid, referrals_completed
  INTO v_referrer_record
  FROM profiles
  WHERE LOWER(wallet_address) = p_referred_by
     OR fid::TEXT = p_referred_by
  LIMIT 1;

  IF v_referrer_record IS NOT NULL THEN
    v_new_count := COALESCE(v_referrer_record.referrals_completed, 0) + 1;

    IF v_referrer_record.wallet_address IS NOT NULL AND
       LOWER(v_referrer_record.wallet_address) = p_referred_by THEN
      UPDATE profiles
      SET
        referrals_completed = v_new_count,
        updated_at = NOW()
      WHERE wallet_address = v_referrer_record.wallet_address;
    ELSIF v_referrer_record.fid IS NOT NULL THEN
      UPDATE profiles
      SET
        referrals_completed = v_new_count,
        updated_at = NOW()
      WHERE fid = v_referrer_record.fid;
    END IF;
  END IF;

  RETURN json_build_object(
    'success', true,
    'walletAddress', p_wallet_address,
    'referredBy', p_referred_by
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to record referral: ' || SQLERRM
    );
END;
$$;

COMMIT;

-- End of migration 001_rpcs.sql

