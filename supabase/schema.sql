create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '' check (char_length(description) <= 500),
  category text not null default 'Personal'
    check (category in ('Personal', 'Work', 'Wellness', 'Learning')),
  due_at timestamptz,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists tasks_user_due_at_idx
  on public.tasks (user_id, due_at);

alter table public.tasks enable row level security;

create policy "Users can read their own tasks"
  on public.tasks for select
  using ((select auth.uid()) = user_id);

create policy "Users can create their own tasks"
  on public.tasks for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own tasks"
  on public.tasks for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own tasks"
  on public.tasks for delete
  using ((select auth.uid()) = user_id);
