-- Widget logs: stores one value per widget per day per user
-- widget_id matches the id field in DashboardConfig.widgets[]

create table if not exists widget_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  widget_id   text not null,
  date        date not null default current_date,
  value       numeric not null default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),

  unique(user_id, widget_id, date)
);

-- RLS
alter table widget_logs enable row level security;

create policy "Users can read own widget logs"
  on widget_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own widget logs"
  on widget_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own widget logs"
  on widget_logs for update
  using (auth.uid() = user_id);

create policy "Users can delete own widget logs"
  on widget_logs for delete
  using (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger widget_logs_updated_at
  before update on widget_logs
  for each row execute function update_updated_at();
