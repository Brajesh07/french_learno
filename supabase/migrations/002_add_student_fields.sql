-- ================================================================
-- Migration 002: Add is_active and has_subscription to profiles
-- ================================================================

alter table public.profiles
  add column if not exists is_active       boolean not null default true,
  add column if not exists has_subscription boolean not null default false;
