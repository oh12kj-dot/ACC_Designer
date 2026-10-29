# Storage lifecycle review

2026-10-05 JST. Scope: migration 006, AssetService, storage SQL tests, interaction with migrations 003/004.
Requested model/effort: gpt-6-sol Medium. Runtime identity/effort are not exposed; do not claim runtime-confirmed Sol review.
One bounded read-only review reported no blocking/high-priority authenticated exploit or committed-image deletion race.

Evidence: commit/claim lock the same reservation row. Only pending can commit; committed returns no cleanup paths; cleaning cannot commit. Object insert takes the reservation lock. Delete requires cleaning, and restrictive update disallows overwrite.

Limits: simplified PGlite Storage schema and one connection; actual Supabase Storage service roles/API and cross-session schedules unverified. Existing broad policy and anon denial were also tested locally with restrictive policies applying to public.
Operational limit: cleanup retries pending uploads older than 24h, possibly invalidating a still-open old tab's uncommitted upload. It cannot delete a committed batch.
