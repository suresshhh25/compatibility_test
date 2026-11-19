-- Run this in Supabase Dashboard > SQL Editor.
create table if not exists public.couple_rooms (
  id uuid primary key default gen_random_uuid(),
  room_code text not null unique,
  created_at timestamptz not null default now()
);
create table if not exists public.couple_participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.couple_rooms(id) on delete cascade,
  role text not null check (role in ('suresh','tanu')),
  display_name text not null,
  token_hash text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  unique(room_id, role)
);
create table if not exists public.couple_answers (
  participant_id uuid primary key references public.couple_participants(id) on delete cascade,
  answers jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists couple_rooms_code_idx on public.couple_rooms(room_code);
create index if not exists couple_participants_room_idx on public.couple_participants(room_id);

-- All access goes through the Edge Function using the server-side service role key.
-- Never create public anon policies for these tables.
alter table public.couple_rooms enable row level security;
alter table public.couple_participants enable row level security;
alter table public.couple_answers enable row level security;
