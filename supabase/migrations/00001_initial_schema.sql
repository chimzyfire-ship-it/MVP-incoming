-- 00001_initial_schema.sql
-- Run this in your Supabase SQL Editor

-- 1. Extend Users table
create table public.users (
  id uuid references auth.users(id) on delete cascade not null primary key,
  email text,
  name text,
  skill_level text,
  interests text[] default '{}',
  credits integer default 50,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on Row Level Security
alter table public.users enable row level security;

-- Policies for public.users
create policy "Users can view their own profile." on public.users
  for select using (auth.uid() = id);

create policy "Users can update their own profile." on public.users
  for update using (auth.uid() = id);

-- Trigger to automatically create a public.users row when a new auth.user signs up
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.users (id, email, name)
  values (new.id, new.email, new.raw_user_meta_data->>'name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Tools (Catalog) Table
create table public.tools (
  id serial primary key,
  title text not null,
  full_name text not null unique,
  description text,
  stars integer default 0,
  forks integer default 0,
  url text,
  language text,
  topics text[] default '{}',
  easy_to_run boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.tools enable row level security;

-- Everyone can read the catalog
create policy "Catalog is public." on public.tools
  for select using (true);

-- 3. Runs (Deployments)
create table public.runs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  tool_id integer references public.tools(id) on delete cascade not null,
  status text default 'queued',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.runs enable row level security;
create policy "Users can view their own runs" on public.runs for select using (auth.uid() = user_id);
create policy "Users can insert their own runs" on public.runs for insert with check (auth.uid() = user_id);

-- 4. Posts (Social Feed)
create table public.posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  tool_id integer references public.tools(id) on delete set null,
  image_url text,
  content text,
  likes integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.posts enable row level security;
-- Everyone can read posts
create policy "Posts are public" on public.posts for select using (true);
create policy "Users can insert their own posts" on public.posts for insert with check (auth.uid() = user_id);
