-- Cosmic Signal Phase 2 Schema
-- Migration 001: Initial schema

-- Enable required extensions
create extension if not exists "uuid-ossp" with schema "extensions";
create extension if not exists "pgcrypto" with schema "extensions";

-- =============================================
-- PROFILES (extends Supabase auth.users)
-- =============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  timezone text default 'America/New_York',
  onboarding_complete boolean default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- =============================================
-- MARKET ACCESS CONSTRAINTS
-- =============================================
create table public.market_access (
  id uuid default extensions.uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  markets text[] not null default '{"US"}',
  vehicle_types text[] not null default '{"equity", "ETF", "options"}',
  created_at timestamptz default now() not null
);

-- =============================================
-- RISK PARAMETERS
-- =============================================
create table public.risk_params (
  id uuid default extensions.uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  max_concentration_pct numeric default 25,
  max_single_position_pct numeric default 10,
  horizon_months int default 12,
  risk_tolerance text default 'moderate' check (risk_tolerance in ('conservative', 'moderate', 'aggressive')),
  created_at timestamptz default now() not null
);

-- =============================================
-- NOTIFICATION PREFERENCES
-- =============================================
create table public.notification_prefs (
  id uuid default extensions.uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  thesis_break_alerts boolean default true,
  weekly_brief_email boolean default true,
  brief_day text default 'Sunday' check (brief_day in ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
  brief_time text default '09:00',
  created_at timestamptz default now() not null
);

-- =============================================
-- THEMATICS (the core entity)
-- =============================================
create table public.thematics (
  id uuid default extensions.uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  thesis_statement text not null,
  status text default 'active' check (status in ('draft', 'active', 'paused', 'archived', 'broken')),
  confidence text default 'moderate' check (confidence in ('low', 'moderate', 'high', 'very_high')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- =============================================
-- CAUSAL NODES (thesis decomposition)
-- =============================================
create table public.causal_nodes (
  id uuid default extensions.uuid_generate_v4() primary key,
  thematic_id uuid references public.thematics(id) on delete cascade not null,
  node_type text not null check (node_type in ('driver', 'mechanism', 'outcome', 'risk')),
  label text not null,
  description text,
  parent_node_id uuid references public.causal_nodes(id) on delete cascade,
  order_index int not null default 0,
  created_at timestamptz default now() not null
);

-- =============================================
-- MONITORING QUERIES (per-thematic, stored)
-- =============================================
create table public.monitoring_queries (
  id uuid default extensions.uuid_generate_v4() primary key,
  thematic_id uuid references public.thematics(id) on delete cascade not null,
  causal_node_id uuid references public.causal_nodes(id) on delete cascade,
  query_text text not null,
  source_type text default 'news_rss' check (source_type in ('news_rss', 'web_search', 'api')),
  expected_signal text check (expected_signal in ('confirming', 'challenging', 'neutral')),
  is_auto_generated boolean default true,
  is_active boolean default true,
  last_run_at timestamptz,
  noise_count int default 0,  -- tracks consecutive neutral/noise results
  created_at timestamptz default now() not null
);

-- =============================================
-- POSITIONS (investment vehicles)
-- =============================================
create table public.positions (
  id uuid default extensions.uuid_generate_v4() primary key,
  thematic_id uuid references public.thematics(id) on delete cascade not null,
  causal_node_id uuid references public.causal_nodes(id) on delete cascade,
  ticker text not null,
  vehicle_type text not null default 'equity',
  vehicle_name text,
  allocation_pct numeric,
  entry_rationale text,
  created_at timestamptz default now() not null
);

-- =============================================
-- CONTRARIAN CASES
-- =============================================
create table public.contrarian_cases (
  id uuid default extensions.uuid_generate_v4() primary key,
  thematic_id uuid references public.thematics(id) on delete cascade not null,
  scenario_description text not null,
  probability text default 'low' check (probability in ('low', 'moderate', 'high')),
  trigger_conditions text,
  hedge_suggestion text,
  created_at timestamptz default now() not null
);

-- =============================================
-- SIGNALS (output of Monitoring Engine)
-- =============================================
create table public.signals (
  id uuid default extensions.uuid_generate_v4() primary key,
  thematic_id uuid references public.thematics(id) on delete cascade not null,
  monitoring_query_id uuid references public.monitoring_queries(id) on delete cascade,
  causal_node_id uuid references public.causal_nodes(id) on delete cascade,
  title text not null,
  summary text not null,
  source_url text,
  source_name text,
  source_published_at timestamptz,
  classification text not null check (classification in ('confirming', 'challenging', 'neutral', 'thesis_break')),
  strength text default 'moderate' check (strength in ('weak', 'moderate', 'strong')),
  reviewed_in_brief uuid references public.weekly_briefs(id),
  detected_at timestamptz default now() not null
);

-- =============================================
-- WEEKLY BRIEFS (output of Evolution Engine)
-- =============================================
create table public.weekly_briefs (
  id uuid default extensions.uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  thematic_id uuid references public.thematics(id) on delete cascade not null,
  brief_period_start timestamptz not null,
  brief_period_end timestamptz not null,
  thesis_health text not null check (thesis_health in ('strengthening', 'stable', 'under_pressure', 'breaking')),
  health_explanation text not null,
  key_takeaway text not null,
  action_suggestion text,
  is_read boolean default false,
  created_at timestamptz default now() not null
);

-- =============================================
-- BRIEF SECTIONS (structured content within a brief)
-- =============================================
create table public.brief_sections (
  id uuid default extensions.uuid_generate_v4() primary key,
  brief_id uuid references public.weekly_briefs(id) on delete cascade not null,
  section_type text not null check (section_type in ('overview', 'signal_summary', 'thesis_update', 'action_items', 'contrarian_check', 'cross_signals')),
  content text not null,
  order_index int not null default 0,
  created_at timestamptz default now() not null
);

-- =============================================
-- CROSS-SIGNALS (signals that affect multiple thematics)
-- =============================================
create table public.cross_signals (
  id uuid default extensions.uuid_generate_v4() primary key,
  signal_id uuid references public.signals(id) on delete cascade not null,
  related_thematic_id uuid references public.thematics(id) on delete cascade not null,
  relevance_explanation text not null,
  created_at timestamptz default now() not null
);

-- =============================================
-- RESEARCH CONVERSATIONS (Formation Engine logs)
-- =============================================
create table public.research_conversations (
  id uuid default extensions.uuid_generate_v4() primary key,
  thematic_id uuid references public.thematics(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz default now() not null
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
alter table public.profiles enable row level security;
alter table public.market_access enable row level security;
alter table public.risk_params enable row level security;
alter table public.notification_prefs enable row level security;
alter table public.thematics enable row level security;
alter table public.causal_nodes enable row level security;
alter table public.monitoring_queries enable row level security;
alter table public.positions enable row level security;
alter table public.contrarian_cases enable row level security;
alter table public.signals enable row level security;
alter table public.weekly_briefs enable row level security;
alter table public.brief_sections enable row level security;
alter table public.cross_signals enable row level security;
alter table public.research_conversations enable row level security;

-- Profiles: users can only see/update their own
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Market access: users own their constraints
create policy "Users can manage own market access" on public.market_access for all using (auth.uid() = user_id);

-- Risk params: users own their risk settings
create policy "Users can manage own risk params" on public.risk_params for all using (auth.uid() = user_id);

-- Notification prefs: users own their notification settings
create policy "Users can manage own notification prefs" on public.notification_prefs for all using (auth.uid() = user_id);

-- Thematics: users own their thematics
create policy "Users can manage own thematics" on public.thematics for all using (auth.uid() = user_id);

-- Causal nodes: accessible through thematic ownership
create policy "Users can manage causal nodes of own thematics" on public.causal_nodes for all using (
  thematic_id in (select id from public.thematics where user_id = auth.uid())
);

-- Monitoring queries: accessible through thematic ownership
create policy "Users can manage monitoring queries of own thematics" on public.monitoring_queries for all using (
  thematic_id in (select id from public.thematics where user_id = auth.uid())
);

-- Positions: accessible through thematic ownership
create policy "Users can manage positions of own thematics" on public.positions for all using (
  thematic_id in (select id from public.thematics where user_id = auth.uid())
);

-- Contrarian cases: accessible through thematic ownership
create policy "Users can manage contrarian cases of own thematics" on public.contrarian_cases for all using (
  thematic_id in (select id from public.thematics where user_id = auth.uid())
);

-- Signals: accessible through thematic ownership
create policy "Users can view signals of own thematics" on public.signals for select using (
  thematic_id in (select id from public.thematics where user_id = auth.uid())
);
create policy "Service role can insert signals" on public.signals for insert with check (true);
create policy "Service role can update signals" on public.signals for update using (true);

-- Weekly briefs: users own their briefs
create policy "Users can view own briefs" on public.weekly_briefs for select using (auth.uid() = user_id);
create policy "Service role can insert briefs" on public.weekly_briefs for insert with check (true);
create policy "Users can update own briefs" on public.weekly_briefs for update using (auth.uid() = user_id);

-- Brief sections: accessible through brief ownership
create policy "Users can view sections of own briefs" on public.brief_sections for select using (
  brief_id in (select id from public.weekly_briefs where user_id = auth.uid())
);
create policy "Service role can insert brief sections" on public.brief_sections for insert with check (true);

-- Cross signals: viewable through signal/thematic ownership
create policy "Users can view cross signals of own thematics" on public.cross_signals for select using (
  signal_id in (select id from public.signals where thematic_id in (select id from public.thematics where user_id = auth.uid()))
);
create policy "Service role can insert cross signals" on public.cross_signals for insert with check (true);

-- Research conversations: accessible through thematic ownership
create policy "Users can manage conversations of own thematics" on public.research_conversations for all using (
  thematic_id in (select id from public.thematics where user_id = auth.uid())
);

-- =============================================
-- INDEXES
-- =============================================
create index idx_thematics_user on public.thematics(user_id);
create index idx_causal_nodes_thematic on public.causal_nodes(thematic_id);
create index idx_monitoring_queries_thematic on public.monitoring_queries(thematic_id);
create index idx_signals_thematic_detected on public.signals(thematic_id, detected_at desc);
create index idx_signals_classification on public.signals(classification);
create index idx_briefs_user_thematic on public.weekly_briefs(user_id, thematic_id);
create index idx_briefs_period on public.weekly_briefs(brief_period_start desc);
create index idx_conversations_thematic on public.research_conversations(thematic_id);
create index idx_positions_ticker on public.positions(ticker);

-- =============================================
-- FUNCTION: auto-create profile on signup
-- =============================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

-- Trigger: create profile when user signs up
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================
-- FUNCTION: update updated_at timestamp
-- =============================================
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at
  before update on public.profiles
  for each row execute procedure public.update_updated_at();

create trigger set_updated_at_thematic
  before update on public.thematics
  for each row execute procedure public.update_updated_at();