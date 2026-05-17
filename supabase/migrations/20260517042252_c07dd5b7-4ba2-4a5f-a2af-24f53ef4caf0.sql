
-- Roles enum
create type public.app_role as enum ('admin', 'driver', 'customer');

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  phone text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

-- User roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

-- Security definer role checker
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create policy "roles_select_own" on public.user_roles
  for select to authenticated using (user_id = auth.uid());
create policy "roles_admin_all" on public.user_roles
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Signup trigger: create profile + default role
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _role public.app_role;
begin
  insert into public.profiles (id, display_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'phone'
  );

  _role := coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'customer');
  insert into public.user_roles (user_id, role) values (new.id, _role)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Seed demo users
create extension if not exists pgcrypto;

do $$
declare
  demo record;
  uid uuid;
begin
  for demo in
    select * from (values
      ('admin@demo.mn', 'Админ Демо', 'admin'::public.app_role),
      ('driver@demo.mn', 'Жолооч Демо', 'driver'::public.app_role),
      ('customer@demo.mn', 'Харилцагч Демо', 'customer'::public.app_role)
    ) as t(email, display_name, role)
  loop
    if not exists (select 1 from auth.users where email = demo.email) then
      uid := gen_random_uuid();
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
      ) values (
        '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
        demo.email, extensions.crypt('demo1234'::text, extensions.gen_salt('bf')::text),
        now(),
        jsonb_build_object('provider','email','providers',array['email']),
        jsonb_build_object('display_name', demo.display_name, 'role', demo.role::text),
        now(), now(), '', '', '', ''
      );
      -- identity row required for password login
      insert into auth.identities (
        id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
      ) values (
        gen_random_uuid(), uid,
        jsonb_build_object('sub', uid::text, 'email', demo.email),
        'email', demo.email, now(), now(), now()
      );
    end if;
  end loop;
end$$;
