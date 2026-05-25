-- Extend widget_logs with a text column for journal entries and photo URLs
alter table widget_logs
  add column if not exists text_value text;

-- Widget metadata: stores widget-level persistent state (timer start time,
-- challenge start date, etc.) — one key/value pair per widget per user
create table if not exists widget_metadata (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  widget_id   text not null,
  key         text not null,                    -- e.g. 'start_time', 'start_date'
  value       text,                             -- stored as text, parsed by client
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),

  unique(user_id, widget_id, key)
);

-- RLS
alter table widget_metadata enable row level security;

create policy "Users can read own widget metadata"
  on widget_metadata for select
  using (auth.uid() = user_id);

create policy "Users can insert own widget metadata"
  on widget_metadata for insert
  with check (auth.uid() = user_id);

create policy "Users can update own widget metadata"
  on widget_metadata for update
  using (auth.uid() = user_id);

create policy "Users can delete own widget metadata"
  on widget_metadata for delete
  using (auth.uid() = user_id);

-- Auto-update updated_at
create trigger widget_metadata_updated_at
  before update on widget_metadata
  for each row execute function update_updated_at();

-- Storage bucket for progress photos (run separately if needed)
-- insert into storage.buckets (id, name, public) values ('progress-photos', 'progress-photos', false);
