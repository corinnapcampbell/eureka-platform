-- Reverted: is_pro was added and then dropped in the same session.
-- Tier is tracked in user_subscriptions.tier (the existing real system).
-- This migration is a no-op kept for history continuity.
ALTER TABLE public_profiles DROP COLUMN IF EXISTS is_pro;
