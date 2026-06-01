-- ============================================================================
-- TicketSaver · Migración: Cuentas conjuntas / hogares (estilo Splitwise)
-- ----------------------------------------------------------------------------
-- Cómo ejecutarla:
--   1. Abre tu proyecto en https://app.supabase.com
--   2. Ve a "SQL Editor" → "New query"
--   3. Pega TODO este fichero y pulsa "Run".
--
-- Es idempotente: puedes ejecutarla varias veces sin romper nada.
-- No toca los datos existentes de `tickets` ni `ticket_items`.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) PROFILES — espejo de auth.users para poder resolver email -> usuario
--    (invitaciones) y mostrar el nombre de cada miembro del hogar.
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text,
  display_name text,
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Cualquier usuario autenticado puede leer perfiles (para ver nombres de los
-- miembros y para que el invitado se encuentre). Solo el dueño edita el suyo.
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = id);

-- Trigger: crear/actualizar el perfil cuando se registra un usuario.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: crea perfiles para los usuarios que ya existían.
insert into public.profiles (id, email, display_name)
select id, email, coalesce(raw_user_meta_data->>'display_name', split_part(email, '@', 1))
from auth.users
on conflict (id) do nothing;


-- ----------------------------------------------------------------------------
-- 2) HOUSEHOLDS, MEMBERS, INVITES
-- ----------------------------------------------------------------------------
create table if not exists public.households (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null default 'member',   -- 'admin' | 'member'
  joined_at    timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table if not exists public.household_invites (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  email        text not null,
  invited_by   uuid not null references auth.users(id) on delete cascade,
  status       text not null default 'pending',  -- 'pending' | 'accepted' | 'declined'
  created_at   timestamptz not null default now(),
  unique (household_id, email)
);


-- ----------------------------------------------------------------------------
-- 3) FUNCIÓN AUXILIAR — ¿el usuario actual es miembro del hogar?
--    SECURITY DEFINER evita la recursión infinita de RLS sobre
--    household_members (la policy de esa tabla llama a esta función).
-- ----------------------------------------------------------------------------
create or replace function public.is_household_member(hid uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.household_members
    where household_id = hid and user_id = auth.uid()
  );
$$;


-- ----------------------------------------------------------------------------
-- 4) RLS de households / members / invites
-- ----------------------------------------------------------------------------
alter table public.households        enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;

-- households: los miembros (y el creador) ven el hogar; solo el dueño lo gestiona.
drop policy if exists "households_select_member" on public.households;
create policy "households_select_member" on public.households
  for select to authenticated
  using (is_household_member(id) or created_by = auth.uid());

drop policy if exists "households_update_owner" on public.households;
create policy "households_update_owner" on public.households
  for update to authenticated using (created_by = auth.uid());

drop policy if exists "households_delete_owner" on public.households;
create policy "households_delete_owner" on public.households
  for delete to authenticated using (created_by = auth.uid());

-- members: los miembros del hogar ven la lista. Cada uno puede salirse;
-- el dueño puede expulsar a otros. (La inserción se hace vía RPC.)
drop policy if exists "members_select" on public.household_members;
create policy "members_select" on public.household_members
  for select to authenticated using (is_household_member(household_id));

drop policy if exists "members_delete_self_or_owner" on public.household_members;
create policy "members_delete_self_or_owner" on public.household_members
  for delete to authenticated using (
    user_id = auth.uid()
    or exists (
      select 1 from public.households h
      where h.id = household_id and h.created_by = auth.uid()
    )
  );

-- invites: las ve un miembro del hogar o la persona invitada (por su email).
drop policy if exists "invites_select" on public.household_invites;
create policy "invites_select" on public.household_invites
  for select to authenticated
  using (
    is_household_member(household_id)
    or lower(email) = lower(auth.jwt() ->> 'email')
  );

drop policy if exists "invites_delete_member" on public.household_invites;
create policy "invites_delete_member" on public.household_invites
  for delete to authenticated using (is_household_member(household_id));


-- ----------------------------------------------------------------------------
-- 5) RPCs (SECURITY DEFINER) para crear hogar, invitar y aceptar invitación.
--    Centralizan la lógica sensible y simplifican las policies de inserción.
-- ----------------------------------------------------------------------------

-- Crear un hogar y unir al creador como administrador.
create or replace function public.create_household(p_name text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare new_id uuid;
begin
  if coalesce(trim(p_name), '') = '' then
    raise exception 'El nombre del hogar no puede estar vacío';
  end if;

  insert into public.households (name, created_by)
  values (trim(p_name), auth.uid())
  returning id into new_id;

  insert into public.household_members (household_id, user_id, role)
  values (new_id, auth.uid(), 'admin');

  return new_id;
end;
$$;

-- Invitar a alguien por email (solo miembros del hogar).
create or replace function public.invite_to_household(p_household_id uuid, p_email text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_household_member(p_household_id) then
    raise exception 'No eres miembro de este hogar';
  end if;

  insert into public.household_invites (household_id, email, invited_by)
  values (p_household_id, lower(trim(p_email)), auth.uid())
  on conflict (household_id, email)
    do update set status = 'pending', invited_by = auth.uid(), created_at = now();
end;
$$;

-- Aceptar una invitación: valida que el email coincide con el del usuario.
create or replace function public.accept_invite(p_invite_id uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_household  uuid;
  v_email      text;
  v_user_email text;
begin
  select household_id, email into v_household, v_email
  from public.household_invites
  where id = p_invite_id and status = 'pending';

  if v_household is null then
    raise exception 'Invitación no válida o ya utilizada';
  end if;

  select email into v_user_email from auth.users where id = auth.uid();
  if lower(v_user_email) <> lower(v_email) then
    raise exception 'Esta invitación no es para tu cuenta';
  end if;

  insert into public.household_members (household_id, user_id, role)
  values (v_household, auth.uid(), 'member')
  on conflict (household_id, user_id) do nothing;

  update public.household_invites set status = 'accepted' where id = p_invite_id;

  return v_household;
end;
$$;

grant execute on function public.is_household_member(uuid)        to authenticated;
grant execute on function public.create_household(text)           to authenticated;
grant execute on function public.invite_to_household(uuid, text)  to authenticated;
grant execute on function public.accept_invite(uuid)              to authenticated;


-- ----------------------------------------------------------------------------
-- 6) TICKETS — añadir household_id, paid_by y split_mode + RLS para el hogar.
--    Las policies son ADITIVAS (RLS las combina con OR), así que tu policy
--    actual "ver mis propios tickets" (user_id = auth.uid()) sigue intacta.
--
--    paid_by    = quién puso el dinero en caja.
--    split_mode = 'personal' (gasto suyo, no se reparte) |
--                 'shared'   (se reparte a partes iguales entre los miembros).
-- ----------------------------------------------------------------------------
alter table public.tickets
  add column if not exists household_id uuid references public.households(id) on delete set null,
  add column if not exists paid_by      uuid references auth.users(id),
  add column if not exists split_mode   text not null default 'personal';

create index if not exists tickets_household_id_idx on public.tickets(household_id);

-- Un miembro puede VER los tickets asignados a su hogar.
drop policy if exists "tickets_select_household" on public.tickets;
create policy "tickets_select_household" on public.tickets
  for select to authenticated
  using (household_id is not null and is_household_member(household_id));

-- Un miembro puede VER los items de los tickets de su hogar.
drop policy if exists "ticket_items_select_household" on public.ticket_items;
create policy "ticket_items_select_household" on public.ticket_items
  for select to authenticated
  using (exists (
    select 1 from public.tickets t
    where t.id = ticket_items.ticket_id
      and t.household_id is not null
      and is_household_member(t.household_id)
  ));


-- ----------------------------------------------------------------------------
-- 7) HOUSEHOLD_SETTLEMENTS — Bizums / pagos entre miembros para saldar deudas.
--    Un settlement de A -> B por X € significa "A le pagó X € a B".
-- ----------------------------------------------------------------------------
create table if not exists public.household_settlements (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  from_user    uuid not null references auth.users(id),
  to_user      uuid not null references auth.users(id),
  amount       numeric not null check (amount > 0),
  note         text,
  created_by   uuid not null references auth.users(id),
  created_at   timestamptz not null default now()
);

create index if not exists settlements_household_id_idx
  on public.household_settlements(household_id);

alter table public.household_settlements enable row level security;

-- Cualquier miembro del hogar puede ver y registrar pagos del hogar.
drop policy if exists "settlements_select_member" on public.household_settlements;
create policy "settlements_select_member" on public.household_settlements
  for select to authenticated using (is_household_member(household_id));

drop policy if exists "settlements_insert_member" on public.household_settlements;
create policy "settlements_insert_member" on public.household_settlements
  for insert to authenticated
  with check (is_household_member(household_id) and created_by = auth.uid());

drop policy if exists "settlements_delete_member" on public.household_settlements;
create policy "settlements_delete_member" on public.household_settlements
  for delete to authenticated using (is_household_member(household_id));

-- ============================================================================
-- Fin de la migración.
-- ============================================================================
