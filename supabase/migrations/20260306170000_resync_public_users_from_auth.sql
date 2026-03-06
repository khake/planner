create or replace function public.sync_auth_user()
returns trigger as $$
declare
  resolved_name text;
  resolved_avatar_url text;
begin
  resolved_name := coalesce(new.raw_user_meta_data->>'name', new.email);
  resolved_avatar_url := new.raw_user_meta_data->>'avatar_url';

  insert into public.profiles (id, name, avatar_url)
  values (new.id, resolved_name, resolved_avatar_url)
  on conflict (id) do update
    set name = excluded.name,
        avatar_url = excluded.avatar_url;

  insert into public.users (id, name, avatar_url)
  values (new.id, resolved_name, resolved_avatar_url)
  on conflict (id) do update
    set name = excluded.name,
        avatar_url = excluded.avatar_url;

  return new;
end;
$$ language plpgsql security definer;

create or replace function public.remove_deleted_auth_user()
returns trigger as $$
begin
  delete from public.users where id = old.id;
  return old;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_changed on auth.users;
drop trigger if exists on_auth_user_deleted on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.sync_auth_user();

create trigger on_auth_user_changed
after update on auth.users
for each row
execute procedure public.sync_auth_user();

create trigger on_auth_user_deleted
after delete on auth.users
for each row
execute procedure public.remove_deleted_auth_user();

insert into public.profiles (id, name, avatar_url)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'name', u.email),
  u.raw_user_meta_data->>'avatar_url'
from auth.users u
on conflict (id) do update
  set name = excluded.name,
      avatar_url = excluded.avatar_url;

insert into public.users (id, name, avatar_url)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'name', u.email),
  u.raw_user_meta_data->>'avatar_url'
from auth.users u
on conflict (id) do update
  set name = excluded.name,
      avatar_url = excluded.avatar_url;
