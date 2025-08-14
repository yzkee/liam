
BEGIN;

DROP FUNCTION IF EXISTS "public"."match_documents"("filter" "jsonb", "match_count" integer, "query_embedding" "public"."vector", "match_threshold" double precision);

DROP TABLE IF EXISTS "public"."documents";

COMMIT;
