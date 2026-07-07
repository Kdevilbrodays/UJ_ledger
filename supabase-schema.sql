-- Udhar Ledger Database Schema
-- Run this SQL in your Supabase SQL Editor

create table parties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  current_balance numeric default 0,
  created_at timestamptz default now(),
  last_activity timestamptz default now()
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  party_id uuid references parties(id) on delete cascade,
  amount numeric not null check (amount > 0),
  type text not null check (type in ('jama','udhar')),
  date date not null,
  note text,
  source text default 'manual' check (source in ('manual','scan')),
  created_at timestamptz default now()
);

alter table parties enable row level security;
alter table transactions enable row level security;
create policy "allow all" on parties for all using (true);
create policy "allow all" on transactions for all using (true);
alter publication supabase_realtime add table parties;
alter publication supabase_realtime add table transactions;
