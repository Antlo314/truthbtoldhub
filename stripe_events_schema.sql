-- ==========================================
--  STRIPE EVENT LEDGER — once-only webhook processing.
--  The webhook records each Stripe event id here before granting, so a
--  retried/duplicate event can never double-credit Soul Power.
--  Run once in the Supabase SQL editor.
-- ==========================================

create table if not exists public.stripe_events (
    id           text primary key,          -- Stripe event id (evt_...)
    type         text not null default '',
    processed_at timestamptz not null default now()
);

-- service-role (the webhook) bypasses RLS; lock the table to nobody else.
alter table public.stripe_events enable row level security;
