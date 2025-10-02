
BEGIN;

DROP POLICY IF EXISTS "authenticated_users_can_select_org_checkpoint_migrations" ON "public"."checkpoint_migrations";
DROP POLICY IF EXISTS "authenticated_users_can_insert_org_checkpoint_migrations" ON "public"."checkpoint_migrations";
DROP POLICY IF EXISTS "authenticated_users_can_update_org_checkpoint_migrations" ON "public"."checkpoint_migrations";
DROP POLICY IF EXISTS "authenticated_users_can_delete_org_checkpoint_migrations" ON "public"."checkpoint_migrations";
DROP POLICY IF EXISTS "service_role_can_select_all_checkpoint_migrations" ON "public"."checkpoint_migrations";
DROP POLICY IF EXISTS "service_role_can_insert_all_checkpoint_migrations" ON "public"."checkpoint_migrations";
DROP POLICY IF EXISTS "service_role_can_update_all_checkpoint_migrations" ON "public"."checkpoint_migrations";
DROP POLICY IF EXISTS "service_role_can_delete_all_checkpoint_migrations" ON "public"."checkpoint_migrations";

DROP TABLE IF EXISTS "public"."checkpoint_migrations";

REVOKE ALL ON TABLE "public"."checkpoint_migrations" FROM "authenticated";
REVOKE ALL ON TABLE "public"."checkpoint_migrations" FROM "service_role";

COMMIT;
