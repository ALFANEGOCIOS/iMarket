# iMarket Cuba · Integración Supabase

## 1. Migración de mensajería

En Supabase → SQL Editor ejecuta:

`supabase/migration_messages.sql`

Esto crea `conversations` y `messages` con RLS para los participantes.

## 2. Datos de prueba

Ejecuta `supabase/seed_demo.sql` **solo en tu proyecto de pruebas**.

Crea tres vendedores demo y tres publicaciones activas:

- vendedor1@imarketcuba.demo / Demo12345!
- vendedor2@imarketcuba.demo / Demo12345!
- vendedor3@imarketcuba.demo / Demo12345!

El script inserta las cuentas demo en `auth.users`, sus perfiles en `profiles` y publicaciones en `listings`.

Si tu proyecto Supabase tiene una estructura de `auth.users` personalizada o restricciones adicionales, el script puede requerir ajuste en el SQL Editor.

## 3. Storage

La aplicación utiliza estos buckets:

- `listing_images`
- `verifications`
- `avatars` cuando se utiliza el avatar de perfil.

Las políticas de Storage deben permitir al usuario autenticado subir archivos dentro de su propia carpeta y leer las imágenes públicas de anuncios según la configuración del proyecto.

## 4. Conexión

`js/supabase.js` contiene la URL y Publishable key del proyecto. La Publishable key está diseñada para frontend. La seguridad real depende de RLS y de las políticas de Storage.

Todas las páginas cargan `js/bootstrap.js`. Al iniciar, se realiza una consulta real contra `listings`. Si falla, aparece un aviso visible:

**No se pudo conectar con Supabase.**

## 5. Flujo conectado

- Login y registro → Supabase Auth.
- Perfil → `profiles`.
- Publicar → `listings` + Storage + `listing_images`.
- Buscar → `listings` reales.
- Detalle → `listings` + vendedor + imágenes.
- Favoritos → `favorites`.
- Mis publicaciones → `listings` del usuario.
- Ventas → `sales` + `mark_listing_sold` / `confirm_sale`.
- Verificación → `verification_requests` + Storage.
- Mensajes → `conversations` + `messages`.
- Admin → `profiles.role` y métricas reales.
