-- Pin search paths on legacy helper functions still flagged by Supabase security advisors.
-- Safe to apply repeatedly; it does not change function bodies or data.
alter function public._clean_answers(jsonb,bigint[]) set search_path = public, pg_temp;
alter function public._seconds_left(timestamptz) set search_path = public, pg_temp;
alter function public._err(text,text) set search_path = public, pg_temp;
