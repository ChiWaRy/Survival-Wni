-- ============================================================
--  SURVIVAL WNI — Supabase Schema
--  Jalankan file ini di: Supabase Dashboard → SQL Editor → New query
--  (aman dijalankan berulang)
-- ============================================================

-- 1) TABEL PROFIL (kemungkinan sudah ada; ini memastikan aman)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  total_rg bigint default 500,
  gold bigint default 0,
  highest_level int default 1,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- Pemain hanya boleh membaca/membuat/mengubah profilnya sendiri
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);


-- 2) TABEL SIMPAN PROGRES GAME (uang, upgrade, level, HP)
create table if not exists public.game_saves (
  id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table public.game_saves enable row level security;

drop policy if exists "game_saves_select_own" on public.game_saves;
create policy "game_saves_select_own" on public.game_saves
  for select using (auth.uid() = id);

drop policy if exists "game_saves_insert_own" on public.game_saves;
create policy "game_saves_insert_own" on public.game_saves
  for insert with check (auth.uid() = id);

drop policy if exists "game_saves_update_own" on public.game_saves;
create policy "game_saves_update_own" on public.game_saves
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Selesai. Struktur save yang dipakai aplikasi:
-- {
--   money, playerHp,
--   upgrades: { shoes, camera },
--   stats: { baseSpeed, baseDamage, maxHealth },
--   currentLevel, highestLevelReached, totalBribesPaid,
--   claimedRewards: {}, gameCompleted
-- }