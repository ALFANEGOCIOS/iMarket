-- iMarket Cuba - Datos de prueba
--
-- Este script crea tres cuentas DEMO de vendedor directamente en auth.users.
-- Úsalo solamente en tu proyecto de pruebas. Cambia las contraseñas después.
--
-- Credenciales demo:
-- vendedor1@imarketcuba.demo / Demo12345!
-- vendedor2@imarketcuba.demo / Demo12345!
-- vendedor3@imarketcuba.demo / Demo12345!
--
-- Si tu proyecto ya tiene una política/trigger que crea profiles al registrar
-- usuarios, la sección de profiles puede omitirse si ya existen.

create extension if not exists pgcrypto;

DO $$
DECLARE
  u1 uuid := '11111111-1111-4111-8111-111111111111';
  u2 uuid := '22222222-2222-4222-8222-222222222222';
  u3 uuid := '33333333-3333-4333-8333-333333333333';
BEGIN
  IF NOT EXISTS (select 1 from auth.users where id = u1) THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', u1, 'authenticated', 'authenticated',
      'vendedor1@imarketcuba.demo', crypt('Demo12345!', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"José Martínez"}'::jsonb, now(), now()
    );
  END IF;

  IF NOT EXISTS (select 1 from auth.users where id = u2) THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', u2, 'authenticated', 'authenticated',
      'vendedor2@imarketcuba.demo', crypt('Demo12345!', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Ana Rodríguez"}'::jsonb, now(), now()
    );
  END IF;

  IF NOT EXISTS (select 1 from auth.users where id = u3) THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', u3, 'authenticated', 'authenticated',
      'vendedor3@imarketcuba.demo', crypt('Demo12345!', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Carlos Pérez"}'::jsonb, now(), now()
    );
  END IF;

  INSERT INTO public.profiles (id, full_name, phone_number, role, updated_at)
  VALUES
    (u1, 'José Martínez', '+53 555 1201', 'user', now()),
    (u2, 'Ana Rodríguez', '+53 555 1202', 'user', now()),
    (u3, 'Carlos Pérez', '+53 555 1203', 'user', now())
  ON CONFLICT (id) DO UPDATE SET
    full_name = excluded.full_name,
    phone_number = excluded.phone_number,
    updated_at = now();

  INSERT INTO public.listings (
    seller_id, title, model, price, status, storage_capacity,
    aesthetic_condition, color, battery_health, battery_type,
    factory_unlocked, face_id, true_tone, warranty_days,
    cable, charger, municipality, address, description
  ) VALUES
    (u1, 'iPhone 15 Pro 256 GB', 'iPhone 15 Pro', 650, 'active', '256',
     'like_new', 'Titanio natural', 92, 'original', true, true, true, 30,
     true, true, 'Playa', 'La Habana', 'Equipo de uso personal, cuidado y listo para probar.'),
    (u2, 'iPhone 13 128 GB', 'iPhone 13', 390, 'active', '128',
     'good', 'Medianoche', 86, 'original', true, true, true, 0,
     true, false, 'Centro Habana', 'La Habana', 'Todo funcionando correctamente. Se puede revisar antes de comprar.'),
    (u3, 'iPhone 14 Pro 256 GB', 'iPhone 14 Pro', 720, 'active', '256',
     'like_new', 'Morado oscuro', 95, 'original', true, true, true, 60,
     true, true, 'Marianao', 'La Habana', 'Vendedor particular. Información del equipo declarada en el anuncio.')
  ON CONFLICT DO NOTHING;
END $$;
