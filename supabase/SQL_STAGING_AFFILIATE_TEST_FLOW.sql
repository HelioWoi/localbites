-- ============================================
-- STAGING: Affiliate + Checkout validation flow
-- Run in Supabase SQL Editor (staging project)
-- ============================================

-- 0) Set test email once and reuse in all queries
-- Replace if needed
-- Example: helio+stage1@gmail.com

-- 1) Check partner exists and is linked to affiliate
select
  p.id as partner_id,
  p.email,
  p.referred_by_affiliate_id,
  p.stripe_customer_id,
  p.stripe_subscription_id,
  p.subscription_status,
  p.created_at
from partners p
where lower(p.email) = lower('helio@gmail.com');

-- 2) Check latest referral row (after signup via ?ref=...)
select
  r.id,
  r.affiliate_id,
  r.partner_id,
  r.partner_email,
  r.status,
  r.referred_at,
  r.signed_up_at,
  r.first_payment_at,
  r.created_at
from referrals r
join partners p on p.id = r.partner_id
where lower(p.email) = lower('helio@gmail.com')
order by r.created_at desc
limit 1;

-- EXPECTED right after signup:
-- status in ('signed_up', 'tracked', 'trial') depending on webhook timing

-- 3) Check payment history after checkout success
select
  ph.id,
  ph.partner_id,
  ph.stripe_invoice_id,
  ph.amount,
  ph.currency,
  ph.status,
  ph.created_at
from payment_history ph
join partners p on p.id = ph.partner_id
where lower(p.email) = lower('helio@gmail.com')
order by ph.created_at desc;

-- EXPECTED after trial invoice:
-- amount = 0, status = 'paid'

-- 4) Check affiliate commissions (should be empty until first paid invoice)
select
  c.id,
  c.referral_id,
  c.type,
  c.amount,
  c.status,
  c.payment_number,
  c.stripe_invoice_id,
  c.created_at
from affiliate_commissions c
join referrals r on r.id = c.referral_id
join partners p on p.id = r.partner_id
where lower(p.email) = lower('helio@gmail.com')
order by c.created_at desc;

-- EXPECTED before first paid charge:
-- no rows

-- EXPECTED after first paid charge:
-- one row with type='first_payment' and amount=39.00

-- 5) Status checkpoint after first paid charge
select
  r.id,
  r.status,
  r.first_payment_at,
  r.created_at
from referrals r
join partners p on p.id = r.partner_id
where lower(p.email) = lower('helio@gmail.com')
order by r.created_at desc
limit 1;

-- EXPECTED after first paid charge:
-- status = 'qualified', first_payment_at not null

-- 6) Optional: inspect duplicate safety (same invoice should not duplicate commission)
select stripe_invoice_id, count(*)
from affiliate_commissions
where stripe_invoice_id is not null
group by stripe_invoice_id
having count(*) > 1;

-- EXPECTED:
-- no rows

-- 7) Optional cleanup for rerun (CAUTION: staging only)
-- Uncomment in staging only if you want a clean rerun for the same email.

-- delete from affiliate_commissions
-- where referral_id in (
--   select r.id from referrals r
--   join partners p on p.id = r.partner_id
--   where lower(p.email) = lower('helio@gmail.com')
-- );

-- delete from referrals
-- where partner_id in (
--   select p.id from partners p
--   where lower(p.email) = lower('helio@gmail.com')
-- );

-- update partners
-- set referred_by_affiliate_id = null,
--     stripe_customer_id = null,
--     stripe_subscription_id = null,
--     subscription_status = 'inactive'
-- where lower(email) = lower('helio@gmail.com');
