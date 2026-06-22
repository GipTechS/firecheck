-- ─── FireCheck — Schema Supabase ───────────────────────────────────────────
-- Da eseguire in: Supabase Dashboard > SQL Editor > New query > Run

-- Tabella progetti (uno per sede/planimetria)
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;

create policy "Users manage own projects"
  on public.projects
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Tabella dati progetto (estintori, storico controlli, planimetria)
create table public.project_data (
  project_id uuid primary key references public.projects(id) on delete cascade,
  extinguishers jsonb not null default '[]'::jsonb,
  records jsonb not null default '[]'::jsonb,
  floorplan text,
  updated_at timestamptz not null default now()
);

alter table public.project_data enable row level security;

create policy "Users manage own project data"
  on public.project_data
  for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_data.project_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_data.project_id and p.user_id = auth.uid()
    )
  );

-- Trigger: crea automaticamente la riga project_data quando viene creato un progetto
create or replace function public.handle_new_project()
returns trigger as $$
begin
  insert into public.project_data (project_id, extinguishers, records, floorplan)
  values (new.id, '[]'::jsonb, '[]'::jsonb, null);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_project_created
  after insert on public.projects
  for each row execute function public.handle_new_project();
