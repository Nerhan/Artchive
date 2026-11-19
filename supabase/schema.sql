-- Artchive // base de datos en Supabase
-- Pegar completo en Supabase -> SQL Editor -> Run (una sola vez, en un proyecto nuevo).
-- Antes: crear el usuario en Authentication -> Users (con "Auto Confirm User") y
-- desactivar "Allow new users to sign up" en Authentication -> Sign In / Providers.

-- Tabla de entradas
create table public.entries (
  id        bigint generated always as identity primary key,
  owner     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category  text not null,
  title     text not null check (length(trim(title)) > 0),
  creator   text not null default '',
  extra     text not null default '',
  genres    text[] not null default '{}',
  year      integer not null default 0,
  rating    smallint not null default 0 check (rating between 0 and 5),
  status    text not null default 'completed'
            check (status in ('progress', 'completed', 'planned', 'dropped')),
  cover     text not null default '',
  notes     text not null default '',
  added     timestamptz not null default now()
);
create index entries_owner_category on public.entries (owner, category);

-- El guardia: RLS encendido
alter table public.entries enable row level security;

-- Visitantes sin sesión: nada. Con sesión: pueden pedir, pero el guardia decide.
revoke all on public.entries from anon;
grant select, insert, update, delete on public.entries to authenticated;

-- Reglas del guardia: cada quien solo ve y toca SUS entradas
create policy "ver mis entradas" on public.entries
  for select to authenticated using ((select auth.uid()) = owner);
create policy "agregar mis entradas" on public.entries
  for insert to authenticated with check ((select auth.uid()) = owner);
create policy "editar mis entradas" on public.entries
  for update to authenticated using ((select auth.uid()) = owner) with check ((select auth.uid()) = owner);
create policy "borrar mis entradas" on public.entries
  for delete to authenticated using ((select auth.uid()) = owner);
