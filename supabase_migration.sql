-- HLUV Magazine Supabase migration
-- Chạy file này trong Supabase SQL Editor sau khi deploy code mới.

alter table public.comments
add column if not exists parent_id bigint;

create index if not exists comments_parent_id_idx
on public.comments(parent_id);

drop policy if exists "admins can update users" on public.users;
create policy "admins can update users"
on public.users
for update
to authenticated
using (
  exists (
    select 1
    from public.users admin_user
    where lower(admin_user.email) = lower(auth.jwt() ->> 'email')
      and (
        admin_user.role = 'admin'
        or lower(admin_user.email) = 'admin@webtapchi.local'
      )
  )
)
with check (true);

drop policy if exists "admins can delete users" on public.users;
create policy "admins can delete users"
on public.users
for delete
to authenticated
using (
  exists (
    select 1
    from public.users admin_user
    where lower(admin_user.email) = lower(auth.jwt() ->> 'email')
      and (
        admin_user.role = 'admin'
        or lower(admin_user.email) = 'admin@webtapchi.local'
      )
  )
);

drop policy if exists "admins can manage profiles" on public.profiles;
create policy "admins can manage profiles"
on public.profiles
for all
to authenticated
using (
  exists (
    select 1
    from public.users admin_user
    where lower(admin_user.email) = lower(auth.jwt() ->> 'email')
      and (
        admin_user.role = 'admin'
        or lower(admin_user.email) = 'admin@webtapchi.local'
      )
  )
)
with check (true);

drop policy if exists "users can insert comments" on public.comments;
create policy "users can insert comments"
on public.comments
for insert
to authenticated
with check (
  exists (
    select 1
    from public.users app_user
    where app_user.id = comments.user_id
      and lower(app_user.email) = lower(auth.jwt() ->> 'email')
  )
);

drop policy if exists "users can delete own comments or admins delete all" on public.comments;
create policy "users can delete own comments or admins delete all"
on public.comments
for delete
to authenticated
using (
  exists (
    select 1
    from public.users app_user
    where lower(app_user.email) = lower(auth.jwt() ->> 'email')
      and (
        app_user.id = comments.user_id
        or app_user.role = 'admin'
        or lower(app_user.email) = 'admin@webtapchi.local'
      )
  )
);
