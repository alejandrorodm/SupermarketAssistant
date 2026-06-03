-- ============================================================================
-- TicketSaver · Migración: Inventario / despensa
-- ----------------------------------------------------------------------------
-- Cómo ejecutarla:
--   1. Abre tu proyecto en https://app.supabase.com
--   2. Ve a "SQL Editor" → "New query"
--   3. Pega TODO este fichero y pulsa "Run".
--
-- Es idempotente: puedes ejecutarla varias veces sin romper nada.
-- Depende de la migración 0001 (usa la función is_household_member).
--
-- El inventario se rellena solo al guardar un ticket (lo comprado entra en la
-- despensa) y se vacía a mano desde la app. Puede ser personal (household_id
-- nulo) o de un hogar compartido (household_id no nulo), igual que los tickets.
-- ============================================================================

create table if not exists public.inventory_items (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  household_id    uuid references public.households(id) on delete cascade,
  producto_nombre text not null,
  categoria       text not null default 'Otros',
  cantidad        numeric not null default 1 check (cantidad >= 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists inventory_user_id_idx      on public.inventory_items(user_id);
create index if not exists inventory_household_id_idx  on public.inventory_items(household_id);

alter table public.inventory_items enable row level security;

-- SELECT: el dueño ve su despensa personal; los miembros ven la del hogar.
drop policy if exists "inventory_select" on public.inventory_items;
create policy "inventory_select" on public.inventory_items
  for select to authenticated
  using (
    user_id = auth.uid()
    or (household_id is not null and is_household_member(household_id))
  );

-- INSERT: solo a tu propio nombre; si es de un hogar, debes ser miembro.
drop policy if exists "inventory_insert" on public.inventory_items;
create policy "inventory_insert" on public.inventory_items
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and (household_id is null or is_household_member(household_id))
  );

-- UPDATE: el dueño edita la suya; cualquier miembro edita la del hogar.
drop policy if exists "inventory_update" on public.inventory_items;
create policy "inventory_update" on public.inventory_items
  for update to authenticated
  using (
    user_id = auth.uid()
    or (household_id is not null and is_household_member(household_id))
  );

-- DELETE: mismas reglas que UPDATE (quitar de la despensa).
drop policy if exists "inventory_delete" on public.inventory_items;
create policy "inventory_delete" on public.inventory_items
  for delete to authenticated
  using (
    user_id = auth.uid()
    or (household_id is not null and is_household_member(household_id))
  );

-- ============================================================================
-- Fin de la migración.
-- ============================================================================
