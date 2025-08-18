BEGIN;

-- Update artifacts to convert description strings to arrays
-- This migration splits comma-separated description strings into arrays
UPDATE public.artifacts
SET artifact = jsonb_set(
  artifact,
  '{requirement_analysis,requirements}',
  (
    SELECT jsonb_agg(
      CASE 
        -- If description is a string, convert to array
        WHEN jsonb_typeof(req -> 'description') = 'string' THEN
          jsonb_build_object(
            'name', req -> 'name',
            'type', req -> 'type',
            'use_cases', req -> 'use_cases',
            'description', 
            CASE 
              -- Split by ', ' if it looks like a comma-separated list
              WHEN (req ->> 'description') LIKE '%, %' THEN
                to_jsonb(string_to_array(req ->> 'description', ', '))
              -- Otherwise, wrap single string in array
              ELSE
                jsonb_build_array(req ->> 'description')
            END
          )
        -- If already an array, keep as is
        ELSE 
          req
      END
    )
    FROM jsonb_array_elements(artifact -> 'requirement_analysis' -> 'requirements') AS req
  )
)
WHERE artifact -> 'requirement_analysis' -> 'requirements' IS NOT NULL
  AND jsonb_typeof(artifact -> 'requirement_analysis' -> 'requirements') = 'array';

-- Verify the migration by checking if any string descriptions remain
DO $$
DECLARE
  remaining_strings INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO remaining_strings
  FROM public.artifacts,
       jsonb_array_elements(artifact -> 'requirement_analysis' -> 'requirements') AS req
  WHERE jsonb_typeof(req -> 'description') = 'string';
  
  IF remaining_strings > 0 THEN
    RAISE NOTICE 'Found % artifacts with string descriptions still remaining', remaining_strings;
  ELSE
    RAISE NOTICE 'Migration successful: All descriptions are now arrays';
  END IF;
END $$;

COMMIT;