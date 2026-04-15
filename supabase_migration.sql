-- HLUV Magazine Supabase migration
-- Chạy file này trong Supabase SQL Editor sau khi deploy code mới.

alter table public.comments
add column if not exists parent_id bigint;

create index if not exists comments_parent_id_idx
on public.comments(parent_id);

create table if not exists public.notifications (
  id bigserial primary key,
  user_id bigint null,
  actor_id bigint null,
  actor_name text,
  type text not null default 'system',
  post_id bigint null,
  comment_id bigint null,
  parent_comment_id bigint null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamp with time zone not null default now()
);

create index if not exists notifications_user_id_idx
on public.notifications(user_id, is_read, created_at desc);

alter table public.notifications enable row level security;

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

drop policy if exists "users can view own notifications and broadcasts" on public.notifications;
create policy "users can view own notifications and broadcasts"
on public.notifications
for select
to authenticated
using (
  user_id is null
  or exists (
    select 1
    from public.users app_user
    where app_user.id = notifications.user_id
      and lower(app_user.email) = lower(auth.jwt() ->> 'email')
  )
);

drop policy if exists "authenticated users can create action notifications" on public.notifications;
create policy "authenticated users can create action notifications"
on public.notifications
for insert
to authenticated
with check (
  exists (
    select 1
    from public.users actor_user
    where actor_user.id = notifications.actor_id
      and lower(actor_user.email) = lower(auth.jwt() ->> 'email')
      and (
        notifications.user_id is not null
        or actor_user.role = 'admin'
        or lower(actor_user.email) = 'admin@webtapchi.local'
      )
  )
);

drop policy if exists "users can mark own notifications read" on public.notifications;
create policy "users can mark own notifications read"
on public.notifications
for update
to authenticated
using (
  exists (
    select 1
    from public.users app_user
    where app_user.id = notifications.user_id
      and lower(app_user.email) = lower(auth.jwt() ->> 'email')
  )
)
with check (true);
