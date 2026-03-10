-- Una tantum: conferma email per tutti gli utenti già esistenti,
-- così l'opzione "Confirm email" in Supabase non blocca i vecchi account.
-- Esegui questa migration DOPO aver attivato "Confirm email" in Auth → Providers → Email.

UPDATE auth.users
SET
  email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
  raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{email_verified}',
    'true'::jsonb,
    true
  )
WHERE email_confirmed_at IS NULL;
