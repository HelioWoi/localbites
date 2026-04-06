-- ============================================
-- Affiliate referral tracking RPC (safe, non-breaking)
-- ============================================

-- Expand referrals status values to support richer lifecycle while preserving legacy statuses
ALTER TABLE referrals DROP CONSTRAINT IF EXISTS referrals_status_check;
ALTER TABLE referrals ADD CONSTRAINT referrals_status_check
  CHECK (status IN (
    'pending',
    'tracked',
    'signed_up',
    'trial',
    'subscribed',
    'qualified',
    'paid_out',
    'churned'
  ));

-- Track partner referrals safely from client via RPC
CREATE OR REPLACE FUNCTION track_partner_referral(
  p_referral_code TEXT,
  p_partner_id UUID,
  p_partner_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_affiliate RECORD;
  v_existing_referral RECORD;
  v_referral_id UUID;
  v_partner_email TEXT;
  v_partner_ref_affiliate_id UUID;
BEGIN
  v_partner_email := lower(trim(coalesce(p_partner_email, '')));

  IF p_referral_code IS NULL OR trim(p_referral_code) = '' OR p_partner_id IS NULL THEN
    RETURN jsonb_build_object('tracked', false, 'reason', 'missing_params');
  END IF;

  SELECT id, auth_user_id, lower(email) AS email
  INTO v_affiliate
  FROM affiliates
  WHERE referral_code = upper(trim(p_referral_code))
    AND status = 'active'
  LIMIT 1;

  IF v_affiliate.id IS NULL THEN
    RETURN jsonb_build_object('tracked', false, 'reason', 'invalid_referral_code');
  END IF;

  -- Basic fraud prevention: self-referral block by user id or email
  IF v_affiliate.auth_user_id = p_partner_id OR v_affiliate.email = v_partner_email THEN
    RETURN jsonb_build_object('tracked', false, 'reason', 'self_referral_blocked');
  END IF;

  -- Ensure one referral owner per partner
  SELECT id, affiliate_id
  INTO v_existing_referral
  FROM referrals
  WHERE partner_id = p_partner_id
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_existing_referral.id IS NOT NULL THEN
    IF v_existing_referral.affiliate_id = v_affiliate.id THEN
      RETURN jsonb_build_object('tracked', false, 'reason', 'already_tracked_same_affiliate');
    END IF;

    RETURN jsonb_build_object('tracked', false, 'reason', 'already_assigned_other_affiliate');
  END IF;

  SELECT referred_by_affiliate_id
  INTO v_partner_ref_affiliate_id
  FROM partners
  WHERE id = p_partner_id;

  IF v_partner_ref_affiliate_id IS NOT NULL AND v_partner_ref_affiliate_id <> v_affiliate.id THEN
    RETURN jsonb_build_object('tracked', false, 'reason', 'partner_already_has_affiliate');
  END IF;

  -- Keep partner reference synced
  UPDATE partners
  SET referred_by_affiliate_id = v_affiliate.id
  WHERE id = p_partner_id;

  -- Create referral row
  INSERT INTO referrals (
    affiliate_id,
    partner_id,
    partner_email,
    status,
    referred_at,
    signed_up_at,
    created_at
  ) VALUES (
    v_affiliate.id,
    p_partner_id,
    v_partner_email,
    'signed_up',
    NOW(),
    NOW(),
    NOW()
  )
  RETURNING id INTO v_referral_id;

  -- Recalculate affiliate aggregates
  PERFORM update_affiliate_totals(v_affiliate.id);

  RETURN jsonb_build_object(
    'tracked', true,
    'reason', 'ok',
    'affiliate_id', v_affiliate.id,
    'referral_id', v_referral_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION track_partner_referral(TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION track_partner_referral(TEXT, UUID, TEXT) TO service_role;
