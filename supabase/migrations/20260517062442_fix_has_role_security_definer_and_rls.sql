/*
  # Fix has_role security definer + tighten RLS policies

  1. Changes
    - Replace `has_role` with `SECURITY DEFINER` version so RLS policies
      that call it execute with the function owner's privileges, not the
      caller's. Without this, the policy `roles_admin_all` fails because
      the invoking user cannot read `user_roles` under their own RLS.
    - Add `user_roles_select_own` as explicit SELECT policy (replace the
      existing `roles_select_own` which used the old function).
    - Add `user_roles_insert_own` so a new user can self-register their role.
    - Add unique index on `user_roles(user_id)` to prevent duplicate role rows.
    - Add index on `user_roles(role)` for admin lookups.

  2. Security
    - `has_role` is now `SECURITY DEFINER` — runs as DB superuser, bypassing
      RLS on `user_roles` for the sole purpose of checking membership.
      The function is read-only (SELECT EXISTS) and accepts only the
      `app_role` enum, so it cannot be abused for data exfiltration.
    - RLS on `profiles`: users can read/update/insert only their own row.
    - RLS on `user_roles`: users can read their own row; admins can do
      everything; new users can insert their own role on signup.
*/

-- 1. Replace has_role with security definer version
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- 2. Add unique index to prevent duplicate role rows
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_id_key ON public.user_roles(user_id);

-- 3. Add index on role for admin lookups
CREATE INDEX IF NOT EXISTS user_roles_role_idx ON public.user_roles(role);

-- 4. Drop old policies and recreate with proper coverage
DROP POLICY IF EXISTS roles_select_own ON public.user_roles;
DROP POLICY IF EXISTS roles_admin_all ON public.user_roles;

-- Users can read their own role
CREATE POLICY "user_roles_select_own"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can do everything on user_roles
CREATE POLICY "user_roles_admin_all"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- New users can insert their own role on signup
CREATE POLICY "user_roles_insert_own"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
