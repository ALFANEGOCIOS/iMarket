-- iMarket Cuba - Mensajería
-- Ejecutar en Supabase SQL Editor una sola vez.

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  participant_a uuid not null references auth.users(id) on delete cascade,
  participant_b uuid not null references auth.users(id) on delete cascade,
  listing_id uuid null references public.listings(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversations_different_users check (participant_a <> participant_b)
);

create unique index if not exists conversations_unique_pair_listing
on public.conversations (
  least(participant_a, participant_b),
  greatest(participant_a, participant_b),
  coalesce(listing_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz null
);

create index if not exists messages_conversation_created_idx
on public.messages(conversation_id, created_at);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "participants can read conversations"
on public.conversations for select to authenticated
using (auth.uid() in (participant_a, participant_b));

create policy "participants can create conversations"
on public.conversations for insert to authenticated
with check (auth.uid() in (participant_a, participant_b));

create policy "participants can update conversations"
on public.conversations for update to authenticated
using (auth.uid() in (participant_a, participant_b))
with check (auth.uid() in (participant_a, participant_b));

create policy "participants can read messages"
on public.messages for select to authenticated
using (
  exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and auth.uid() in (c.participant_a, c.participant_b)
  )
);

create policy "participants can send messages"
on public.messages for insert to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and auth.uid() in (c.participant_a, c.participant_b)
  )
);

create policy "participants can mark messages read"
on public.messages for update to authenticated
using (
  exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and auth.uid() in (c.participant_a, c.participant_b)
  )
)
with check (
  exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and auth.uid() in (c.participant_a, c.participant_b)
  )
);

create or replace function public.touch_conversation_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations set updated_at = now() where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists messages_touch_conversation on public.messages;
create trigger messages_touch_conversation
after insert on public.messages
for each row execute function public.touch_conversation_updated_at();
