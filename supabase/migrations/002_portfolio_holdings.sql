-- Migration 002: Portfolio holdings table
-- Run manually via Supabase Dashboard → SQL Editor

-- =============================================
-- PORTFOLIO HOLDINGS (user's tracked stocks)
-- =============================================
create table public.portfolio_holdings (
  id uuid default extensions.uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  ticker text not null,
  vehicle_type text not null default 'equity',
  shares numeric default 0,
  avg_cost numeric,
  source text not null default 'direct' check (source in ('thematic', 'direct')),
  source_thematic_id uuid references public.thematics(id) on delete set null,
  created_at timestamptz default now() not null
);

-- One ticker per user (dedup by ticker)
create unique index idx_portfolio_holdings_user_ticker on public.portfolio_holdings(user_id, ticker);

-- RLS
alter table public.portfolio_holdings enable row level security;

create policy "Users can manage own portfolio holdings" on public.portfolio_holdings for all using (auth.uid() = user_id);
create policy "Service role can manage portfolio holdings" on public.portfolio_holdings for all with check (true);
