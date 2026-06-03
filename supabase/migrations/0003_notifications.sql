-- ============================================================================
-- TicketSaver · Migración: soporte de notificaciones in-app
-- ----------------------------------------------------------------------------
-- Cómo ejecutarla:
--   1. Abre tu proyecto en https://app.supabase.com → "SQL Editor" → "New query"
--   2. Pega TODO este fichero y pulsa "Run".
--
-- Es idempotente. Añade `created_at` a tickets (para saber qué tickets son
-- nuevos desde tu última visita) y publica la tabla en Realtime para avisar en
-- el momento cuando alguien del hogar sube un ticket.
-- ============================================================================

-- 1) Marca temporal de creación del ticket (distinta de `fecha`, que es la
--    fecha de compra del ticket). Las filas existentes toman la hora de la
--    migración; las nuevas, el momento de inserción.
alter table public.tickets
  add column if not exists created_at timestamptz not null default now();

create index if not exists tickets_created_at_idx on public.tickets(created_at);

-- 2) Publicar `tickets` en Realtime para recibir los INSERT de otros miembros.
--    La RLS sigue aplicándose: cada usuario solo recibe los tickets que puede
--    leer (los de sus hogares). Idempotente: ignora si ya está publicada.
do $$
begin
  alter publication supabase_realtime add table public.tickets;
exception
  when duplicate_object then null;  -- ya estaba en la publicación
  when undefined_object then null;  -- la publicación no existe en este proyecto
end $$;

-- ============================================================================
-- Fin de la migración.
-- ============================================================================
