-- NextPlayPlayers schema
-- Run in Supabase SQL editor

-- Players table
create table if not exists players (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz default now(),
  name           text not null,
  position       text,
  jersey_number  integer,
  grad_year      integer,
  bio            text,
  photo_url      text,
  avatar_url     text,       -- Ready Player Me .glb URL
  np_team_id     uuid,       -- links to NP-Tournaments bt_master_teams
  np_team_name   text,
  is_active      boolean default true
);

-- Season stats (one row per player per season)
create table if not exists stats (
  id         uuid primary key default gen_random_uuid(),
  player_id  uuid references players(id) on delete cascade,
  season     text default '2025-26',
  gp         integer,        -- games played
  ppg        numeric(4,1),   -- points per game
  rpg        numeric(4,1),   -- rebounds per game
  apg        numeric(4,1),   -- assists per game
  spg        numeric(4,1),   -- steals per game
  bpg        numeric(4,1),   -- blocks per game
  tpg        numeric(4,1),   -- turnovers per game
  fg_pct     numeric(5,3),   -- 0–1
  ft_pct     numeric(5,3),   -- 0–1
  fg3_pct    numeric(5,3)    -- 0–1 (3-point %)
);

-- Social / profile links per player
create table if not exists player_links (
  id         uuid primary key default gen_random_uuid(),
  player_id  uuid references players(id) on delete cascade,
  type       text not null,  -- 'instagram' | 'twitter' | 'tiktok' | 'youtube' | 'maxpreps' | 'other'
  label      text,
  url        text not null
);

-- Photos and videos
create table if not exists player_media (
  id         uuid primary key default gen_random_uuid(),
  player_id  uuid references players(id) on delete cascade,
  type       text not null,  -- 'photo' | 'video'
  url        text not null,
  caption    text,
  created_at timestamptz default now()
);

-- Row Level Security (allow public read; restrict writes)
alter table players      enable row level security;
alter table stats        enable row level security;
alter table player_links enable row level security;
alter table player_media enable row level security;

-- Public read for everyone
create policy "public read players"      on players      for select using (true);
create policy "public read stats"        on stats        for select using (true);
create policy "public read player_links" on player_links for select using (true);
create policy "public read player_media" on player_media for select using (true);

-- Write only with service role (use admin functions or direct SQL for now)
-- To allow authenticated admins to write, add auth.uid() check here later
