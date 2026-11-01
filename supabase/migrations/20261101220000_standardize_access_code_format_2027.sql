-- Standardize newly generated BrainLab access codes.
-- Existing codes are intentionally left unchanged to avoid invalidating vouchers already distributed.
CREATE OR REPLACE FUNCTION public._gen_code()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  alphabet CONSTANT text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
  suffix text := '';
  i integer;
BEGIN
  FOR i IN 0..15 LOOP
    suffix := suffix || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
    EXIT WHEN length(suffix) = 6;
  END LOOP;
  RETURN 'BL-2027-' || suffix;
END;
$function$;
