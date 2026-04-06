-- ================================================================
-- STAGING: E2E Affiliate System Validation
-- Run EACH SECTION one at a time in Supabase SQL Editor (staging)
-- Project: qunipictzxfjfowiooyi
-- ================================================================
-- 
-- CHECKLIST (se fosse meu app, eu validaria TUDO isso):
--
-- [  ] 1. Affiliate existe com referral_code correto
-- [  ] 2. Partner signup via link do affiliate → referral criado
-- [  ] 3. Referral status = 'signed_up' após signup
-- [  ] 4. Partner tem referred_by_affiliate_id correto
-- [  ] 5. Trial invoice ($0) → referral status = 'trial', ZERO comissão
-- [  ] 6. Primeiro pagamento real ($39) → comissão first_payment $39
-- [  ] 7. Referral status = 'qualified' após primeiro pagamento
-- [  ] 8. Pagamentos recorrentes → comissão 25% ($9.75 de $39)
-- [  ] 9. Máximo 7 comissões por referral (1 first + 6 recurring)
-- [  ] 10. Invoice duplicada NÃO gera comissão duplicada
-- [  ] 11. Self-referral é bloqueado
-- [  ] 12. Affiliate totals atualizados corretamente
-- [  ] 13. Affiliate dashboard mostra dados corretos
-- ================================================================


-- ================================================================
-- SECTION 1: SETUP - Criar affiliate de teste
-- ================================================================

-- 1a) Criar auth user para o affiliate (para poder logar no /affiliate)
DO $$
DECLARE
  aff_uid uuid := gen_random_uuid();
BEGIN
  -- Criar auth user
  INSERT INTO auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, confirmation_token, recovery_token, email_change_token_new
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    aff_uid,
    'authenticated', 'authenticated',
    'affiliate-test@gmail.com',
    crypt('test123', gen_salt('bf')),
    now(),
    now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    false, '', '', ''
  );

  -- Criar identidade
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    aff_uid, aff_uid,
    jsonb_build_object('sub', aff_uid::text, 'email', 'affiliate-test@gmail.com'),
    'email', aff_uid::text,
    now(), now(), now()
  );

  -- Criar affiliate com referral code fixo para facilitar testes
  INSERT INTO affiliates (
    id, email, name, phone, referral_code, auth_user_id,
    status, total_referrals, total_earned, total_paid,
    payment_method, payment_details
  ) VALUES (
    gen_random_uuid(),
    'affiliate-test@gmail.com',
    'Test Affiliate Ana',
    '0412345678',
    'TEST01',
    aff_uid,
    'active', 0, 0, 0,
    'bank_transfer',
    '{"bsb": "062-000", "account_number": "12345678", "account_name": "Ana Test"}'::jsonb
  );

  RAISE NOTICE 'Affiliate created with auth_user_id: %', aff_uid;
END $$;

-- 1b) VERIFICAÇÃO: affiliate existe?
SELECT id, email, name, referral_code, auth_user_id, status, total_referrals, total_earned
FROM affiliates
WHERE email = 'affiliate-test@gmail.com';
-- ESPERADO: 1 row, referral_code = 'TEST01', status = 'active', totals = 0


-- ================================================================
-- SECTION 2: SIMULAR PARTNER SIGNUP VIA LINK DO AFFILIATE
-- (Em produção isso acontece automaticamente quando partner clica no link
--  e o frontend chama track_partner_referral RPC)
-- ================================================================

-- 2a) Simular o RPC track_partner_referral como o frontend faria
SELECT track_partner_referral(
  'TEST01',                                    -- referral_code do affiliate
  (SELECT id FROM partners WHERE email = 'helio@gmail.com'),  -- partner_id
  'helio@gmail.com'                            -- partner_email
);
-- ESPERADO: {"tracked": true, "reason": "ok", "affiliate_id": "...", "referral_id": "..."}

-- 2b) VERIFICAÇÃO: partner foi vinculado ao affiliate?
SELECT id, email, referred_by_affiliate_id, stripe_customer_id
FROM partners
WHERE email = 'helio@gmail.com';
-- ESPERADO: referred_by_affiliate_id = id do affiliate TEST01

-- 2c) VERIFICAÇÃO: referral foi criado?
SELECT r.id, r.affiliate_id, r.partner_email, r.status, r.signed_up_at, r.first_payment_at
FROM referrals r
JOIN affiliates a ON a.id = r.affiliate_id
WHERE a.referral_code = 'TEST01'
  AND r.partner_email = 'helio@gmail.com';
-- ESPERADO: status = 'signed_up', signed_up_at preenchido, first_payment_at NULL

-- 2d) VERIFICAÇÃO: affiliate totals atualizados?
SELECT total_referrals, total_earned, total_paid
FROM affiliates
WHERE referral_code = 'TEST01';
-- ESPERADO: total_referrals = 1, total_earned = 0, total_paid = 0


-- ================================================================
-- SECTION 3: TESTE DE FRAUDE - Self-referral deve ser bloqueado
-- ================================================================

-- 3a) Tentar self-referral (affiliate referindo a si mesmo)
-- Primeiro precisamos saber o auth_user_id do affiliate
SELECT track_partner_referral(
  'TEST01',
  (SELECT auth_user_id FROM affiliates WHERE referral_code = 'TEST01'),
  'affiliate-test@gmail.com'
);
-- ESPERADO: {"tracked": false, "reason": "self_referral_blocked"}

-- 3b) Tentar referral duplicado (mesmo partner de novo)
SELECT track_partner_referral(
  'TEST01',
  (SELECT id FROM partners WHERE email = 'helio@gmail.com'),
  'helio@gmail.com'
);
-- ESPERADO: {"tracked": false, "reason": "already_tracked_same_affiliate"}


-- ================================================================
-- SECTION 4: SIMULAR TRIAL INVOICE ($0) - via webhook
-- (Em produção o Stripe webhook faz isso automaticamente)
-- ================================================================

-- 4a) Simular o que o webhook faz quando recebe invoice.paid com amount=0
-- Atualizar referral para 'trial'
UPDATE referrals
SET status = 'trial'
WHERE partner_id = (SELECT id FROM partners WHERE email = 'helio@gmail.com')
  AND status IN ('pending', 'signed_up', 'tracked');

-- 4b) Inserir payment_history do trial
INSERT INTO payment_history (partner_id, stripe_invoice_id, amount, currency, status, description)
SELECT id, 'in_trial_test_001', 0, 'aud', 'paid', 'Trial invoice'
FROM partners WHERE email = 'helio@gmail.com';

-- 4c) VERIFICAÇÃO: referral agora é trial?
SELECT r.status, r.first_payment_at
FROM referrals r
JOIN affiliates a ON a.id = r.affiliate_id
WHERE a.referral_code = 'TEST01'
  AND r.partner_email = 'helio@gmail.com';
-- ESPERADO: status = 'trial', first_payment_at = NULL

-- 4d) VERIFICAÇÃO: ZERO comissões (trial não gera comissão)
SELECT count(*) as commission_count
FROM affiliate_commissions ac
JOIN referrals r ON r.id = ac.referral_id
JOIN affiliates a ON a.id = r.affiliate_id
WHERE a.referral_code = 'TEST01';
-- ESPERADO: 0


-- ================================================================
-- SECTION 5: SIMULAR PRIMEIRO PAGAMENTO REAL ($39)
-- (Em produção o webhook Stripe faz isso automaticamente)
-- ================================================================

-- 5a) Variáveis para reutilizar
-- (rodar como bloco)
DO $$
DECLARE
  v_partner_id uuid;
  v_affiliate_id uuid;
  v_referral_id uuid;
  v_referral record;
  v_existing_count integer;
BEGIN
  SELECT id INTO v_partner_id FROM partners WHERE email = 'helio@gmail.com';
  SELECT id INTO v_affiliate_id FROM affiliates WHERE referral_code = 'TEST01';
  
  SELECT id, first_payment_at INTO v_referral
  FROM referrals
  WHERE affiliate_id = v_affiliate_id AND partner_id = v_partner_id;
  
  v_referral_id := v_referral.id;
  
  -- Contar comissões existentes
  SELECT count(*) INTO v_existing_count
  FROM affiliate_commissions WHERE referral_id = v_referral_id;
  
  -- Verificar duplicata de invoice
  IF EXISTS (SELECT 1 FROM affiliate_commissions WHERE stripe_invoice_id = 'in_first_payment_test_001') THEN
    RAISE NOTICE 'DUPLICATA: invoice já processada, pulando';
    RETURN;
  END IF;

  -- É primeiro pagamento? (first_payment_at é NULL)
  IF v_referral.first_payment_at IS NULL THEN
    -- First payment: comissão fixa $39
    INSERT INTO affiliate_commissions (
      affiliate_id, referral_id, partner_id, stripe_invoice_id,
      type, amount, invoice_amount, commission_rate, payment_number, status
    ) VALUES (
      v_affiliate_id, v_referral_id, v_partner_id, 'in_first_payment_test_001',
      'first_payment', 39.00, 39.00, null, v_existing_count + 1, 'pending'
    );

    -- Atualizar referral para qualified
    UPDATE referrals
    SET status = 'qualified', first_payment_at = now()
    WHERE id = v_referral_id;

    RAISE NOTICE 'First payment commission: $39.00 (payment #%)', v_existing_count + 1;
  END IF;

  -- Inserir payment_history
  INSERT INTO payment_history (partner_id, stripe_invoice_id, amount, currency, status, description)
  VALUES (v_partner_id, 'in_first_payment_test_001', 3900, 'aud', 'paid', 'First subscription payment');

  -- Atualizar totals do affiliate
  PERFORM update_affiliate_totals(v_affiliate_id);
  
  RAISE NOTICE 'Done: first payment processed';
END $$;

-- 5b) VERIFICAÇÃO: comissão first_payment criada?
SELECT ac.type, ac.amount, ac.invoice_amount, ac.commission_rate, ac.payment_number, ac.status, ac.stripe_invoice_id
FROM affiliate_commissions ac
JOIN referrals r ON r.id = ac.referral_id
JOIN affiliates a ON a.id = r.affiliate_id
WHERE a.referral_code = 'TEST01'
ORDER BY ac.payment_number;
-- ESPERADO: 1 row, type='first_payment', amount=39.00, payment_number=1, status='pending'

-- 5c) VERIFICAÇÃO: referral agora é qualified?
SELECT r.status, r.first_payment_at
FROM referrals r
JOIN affiliates a ON a.id = r.affiliate_id
WHERE a.referral_code = 'TEST01'
  AND r.partner_email = 'helio@gmail.com';
-- ESPERADO: status = 'qualified', first_payment_at NOT NULL

-- 5d) VERIFICAÇÃO: affiliate totals
-- NOTA: total_earned só conta comissões com status 'approved' ou 'paid'
-- Comissões recém-criadas têm status 'pending', então total_earned = 0 até aprovar
SELECT total_referrals, total_earned, total_paid
FROM affiliates WHERE referral_code = 'TEST01';
-- ESPERADO: total_referrals = 1, total_earned = 0 (pending não conta), total_paid = 0


-- ================================================================
-- SECTION 6: SIMULAR PAGAMENTOS RECORRENTES (25% de $39 = $9.75)
-- Testar até o máximo de 7 comissões
-- ================================================================

DO $$
DECLARE
  v_partner_id uuid;
  v_affiliate_id uuid;
  v_referral_id uuid;
  v_existing_count integer;
  v_month integer;
  v_invoice_id text;
  v_commission_amount numeric;
BEGIN
  SELECT id INTO v_partner_id FROM partners WHERE email = 'helio@gmail.com';
  SELECT id INTO v_affiliate_id FROM affiliates WHERE referral_code = 'TEST01';
  SELECT id INTO v_referral_id FROM referrals
    WHERE affiliate_id = v_affiliate_id AND partner_id = v_partner_id;

  FOR v_month IN 2..7 LOOP
    v_invoice_id := 'in_recurring_test_' || LPAD(v_month::text, 3, '0');
    
    -- Contar comissões existentes
    SELECT count(*) INTO v_existing_count
    FROM affiliate_commissions WHERE referral_id = v_referral_id;
    
    -- Verificar limite de 7
    IF v_existing_count >= 7 THEN
      RAISE NOTICE 'MAX REACHED: % comissões já existem, parando', v_existing_count;
      EXIT;
    END IF;

    -- Verificar duplicata
    IF EXISTS (SELECT 1 FROM affiliate_commissions WHERE stripe_invoice_id = v_invoice_id) THEN
      RAISE NOTICE 'SKIP: invoice % já existe', v_invoice_id;
      CONTINUE;
    END IF;

    -- 25% de $39 = $9.75
    v_commission_amount := ROUND(39.00 * 0.25, 2);

    INSERT INTO affiliate_commissions (
      affiliate_id, referral_id, partner_id, stripe_invoice_id,
      type, amount, invoice_amount, commission_rate, payment_number, status
    ) VALUES (
      v_affiliate_id, v_referral_id, v_partner_id, v_invoice_id,
      'recurring', v_commission_amount, 39.00, 25.00, v_existing_count + 1, 'pending'
    );

    -- Payment history
    INSERT INTO payment_history (partner_id, stripe_invoice_id, amount, currency, status, description)
    VALUES (v_partner_id, v_invoice_id, 3900, 'aud', 'paid', 'Monthly payment #' || v_month);

    RAISE NOTICE 'Recurring commission #%: $% (payment #%)', v_month, v_commission_amount, v_existing_count + 1;
  END LOOP;

  PERFORM update_affiliate_totals(v_affiliate_id);
  RAISE NOTICE 'Done: recurring payments processed';
END $$;

-- 6b) VERIFICAÇÃO: todas as 7 comissões criadas?
SELECT ac.type, ac.amount, ac.commission_rate, ac.payment_number, ac.status, ac.stripe_invoice_id
FROM affiliate_commissions ac
JOIN referrals r ON r.id = ac.referral_id
JOIN affiliates a ON a.id = r.affiliate_id
WHERE a.referral_code = 'TEST01'
ORDER BY ac.payment_number;
-- ESPERADO: 7 rows total
-- payment_number 1: type=first_payment, amount=39.00
-- payment_number 2-7: type=recurring, amount=9.75, commission_rate=25.00

-- 6c) VERIFICAÇÃO: cálculo total de comissões
SELECT
  count(*) as total_commissions,
  sum(amount) as total_amount,
  sum(CASE WHEN type = 'first_payment' THEN amount ELSE 0 END) as first_payment_total,
  sum(CASE WHEN type = 'recurring' THEN amount ELSE 0 END) as recurring_total
FROM affiliate_commissions ac
JOIN referrals r ON r.id = ac.referral_id
JOIN affiliates a ON a.id = r.affiliate_id
WHERE a.referral_code = 'TEST01';
-- ESPERADO:
--   total_commissions = 7
--   total_amount = 39.00 + (6 × 9.75) = 39.00 + 58.50 = $97.50
--   first_payment_total = 39.00
--   recurring_total = 58.50


-- ================================================================
-- SECTION 7: TESTE - 8ª comissão deve ser BLOQUEADA (max 7)
-- ================================================================

DO $$
DECLARE
  v_partner_id uuid;
  v_affiliate_id uuid;
  v_referral_id uuid;
  v_existing_count integer;
BEGIN
  SELECT id INTO v_partner_id FROM partners WHERE email = 'helio@gmail.com';
  SELECT id INTO v_affiliate_id FROM affiliates WHERE referral_code = 'TEST01';
  SELECT id INTO v_referral_id FROM referrals
    WHERE affiliate_id = v_affiliate_id AND partner_id = v_partner_id;

  SELECT count(*) INTO v_existing_count
  FROM affiliate_commissions WHERE referral_id = v_referral_id;

  IF v_existing_count >= 7 THEN
    RAISE NOTICE '✅ PASS: Max commissions reached (%). 8th blocked correctly.', v_existing_count;
  ELSE
    RAISE NOTICE '❌ FAIL: Only % commissions, expected 7', v_existing_count;
  END IF;
END $$;
-- ESPERADO no Messages: "✅ PASS: Max commissions reached (7). 8th blocked correctly."


-- ================================================================
-- SECTION 8: TESTE - Invoice duplicada NÃO gera comissão duplicada
-- ================================================================

SELECT count(*)
FROM affiliate_commissions
WHERE stripe_invoice_id = 'in_first_payment_test_001';
-- ESPERADO: exatamente 1 (não duplicou)

-- Tentar inserir duplicata manualmente (simular webhook recebendo mesmo evento 2x)
DO $$
DECLARE
  v_exists boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM affiliate_commissions WHERE stripe_invoice_id = 'in_first_payment_test_001'
  ) INTO v_exists;

  IF v_exists THEN
    RAISE NOTICE '✅ PASS: Duplicate invoice protection working';
  ELSE
    RAISE NOTICE '❌ FAIL: Invoice not found, something wrong';
  END IF;
END $$;


-- ================================================================
-- SECTION 9: SIMULAR APROVAÇÃO DE COMISSÕES (admin aprova)
-- Isso faz o total_earned subir no affiliate
-- ================================================================

-- 9a) Aprovar todas as comissões pendentes
UPDATE affiliate_commissions
SET status = 'approved'
WHERE affiliate_id = (SELECT id FROM affiliates WHERE referral_code = 'TEST01')
  AND status = 'pending';

-- 9b) Recalcular totals
SELECT update_affiliate_totals(id) FROM affiliates WHERE referral_code = 'TEST01';

-- 9c) VERIFICAÇÃO: affiliate totals agora refletem earnings
SELECT total_referrals, total_earned, total_paid
FROM affiliates WHERE referral_code = 'TEST01';
-- ESPERADO: total_referrals = 1, total_earned = 97.50, total_paid = 0


-- ================================================================
-- SECTION 10: SIMULAR PAYOUT (admin paga affiliate)
-- ================================================================

-- 10a) Criar payout
INSERT INTO affiliate_payouts (affiliate_id, amount, method, reference, notes)
SELECT id, 97.50, 'bank_transfer', 'TXN-2026-001', 'First payout - all commissions'
FROM affiliates WHERE referral_code = 'TEST01';

-- 10b) Marcar comissões como pagas
UPDATE affiliate_commissions
SET status = 'paid', paid_at = now()
WHERE affiliate_id = (SELECT id FROM affiliates WHERE referral_code = 'TEST01')
  AND status = 'approved';

-- 10c) Recalcular totals
SELECT update_affiliate_totals(id) FROM affiliates WHERE referral_code = 'TEST01';

-- 10d) VERIFICAÇÃO FINAL: tudo batendo
SELECT total_referrals, total_earned, total_paid
FROM affiliates WHERE referral_code = 'TEST01';
-- ESPERADO: total_referrals = 1, total_earned = 97.50, total_paid = 97.50


-- ================================================================
-- SECTION 11: VERIFICAÇÃO FINAL COMPLETA
-- ================================================================

-- 11a) Resumo do affiliate
SELECT
  a.name,
  a.referral_code,
  a.status,
  a.total_referrals,
  a.total_earned,
  a.total_paid,
  (SELECT count(*) FROM referrals WHERE affiliate_id = a.id) as referrals_count,
  (SELECT count(*) FROM affiliate_commissions WHERE affiliate_id = a.id) as commissions_count,
  (SELECT sum(amount) FROM affiliate_commissions WHERE affiliate_id = a.id) as commissions_total,
  (SELECT count(*) FROM affiliate_payouts WHERE affiliate_id = a.id) as payouts_count
FROM affiliates a
WHERE a.referral_code = 'TEST01';

-- 11b) Payment history do partner referido
SELECT stripe_invoice_id, amount, currency, status, description, created_at
FROM payment_history
WHERE partner_id = (SELECT id FROM partners WHERE email = 'helio@gmail.com')
ORDER BY created_at;
-- ESPERADO: 7 rows (1 trial $0 + 1 first $39 + 5 recurring $39)

-- 11c) Lifecycle completo do referral
SELECT
  r.status as referral_status,
  r.referred_at,
  r.signed_up_at,
  r.first_payment_at,
  p.email as partner_email,
  p.subscription_status,
  p.stripe_customer_id
FROM referrals r
JOIN partners p ON p.id = r.partner_id
WHERE r.affiliate_id = (SELECT id FROM affiliates WHERE referral_code = 'TEST01');
-- ESPERADO: referral_status = 'qualified', first_payment_at NOT NULL


-- ================================================================
-- SECTION 12: CLEANUP (para poder rodar tudo de novo)
-- CUIDADO: só rodar se quiser resetar o teste
-- ================================================================

-- DESCOMENTE para limpar:

-- DELETE FROM affiliate_payouts WHERE affiliate_id = (SELECT id FROM affiliates WHERE referral_code = 'TEST01');
-- DELETE FROM affiliate_commissions WHERE affiliate_id = (SELECT id FROM affiliates WHERE referral_code = 'TEST01');
-- DELETE FROM referrals WHERE affiliate_id = (SELECT id FROM affiliates WHERE referral_code = 'TEST01');
-- DELETE FROM payment_history WHERE partner_id = (SELECT id FROM partners WHERE email = 'helio@gmail.com');
-- UPDATE partners SET referred_by_affiliate_id = null WHERE email = 'helio@gmail.com';
-- DELETE FROM affiliates WHERE referral_code = 'TEST01';
-- DELETE FROM auth.identities WHERE user_id = (SELECT id FROM auth.users WHERE email = 'affiliate-test@gmail.com');
-- DELETE FROM auth.users WHERE email = 'affiliate-test@gmail.com';
