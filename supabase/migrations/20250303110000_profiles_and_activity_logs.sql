-- โปรไฟล์ผู้ใช้ (ผูกกับ auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  avatar_url text,
  created_at timestamptz default now()
);

comment on table public.profiles is 'User profiles synced from auth.users';

-- เมื่อมี user ใหม่ใน auth.users ให้สร้าง profile อัตโนมัติ
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
    set name = excluded.name,
        avatar_url = excluded.avatar_url;

  -- sync ไปยัง public.users (ใช้ตารางเดิมเป็น assignee list)
  insert into public.users (id, name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email), new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do update
    set name = excluded.name,
        avatar_url = excluded.avatar_url;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();

-- Activity logs
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid not null,
  details jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_activity_logs_user_id on public.activity_logs(user_id);
create index if not exists idx_activity_logs_target on public.activity_logs(target_type, target_id);

comment on table public.activity_logs is 'User activity logs (task/sprint/comment changes)';

