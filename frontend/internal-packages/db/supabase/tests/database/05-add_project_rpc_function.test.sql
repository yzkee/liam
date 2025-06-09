BEGIN;

SELECT plan(15);

SELECT tests.create_supabase_user('project_creator@example.com', 'project_creator');
SELECT tests.create_supabase_user('non_member@example.com', 'non_member');

INSERT INTO organizations (id, name)
VALUES ('88888888-8888-8888-8888-888888888888', 'Test Organization for Projects')
ON CONFLICT DO NOTHING;

DO $$
DECLARE
    v_creator_id uuid;
    v_non_member_id uuid;
BEGIN
    SELECT tests.get_supabase_uid('project_creator@example.com') INTO v_creator_id;
    SELECT tests.get_supabase_uid('non_member@example.com') INTO v_non_member_id;
    
    INSERT INTO organization_members (user_id, organization_id)
    VALUES (v_creator_id, '88888888-8888-8888-8888-888888888888')
    ON CONFLICT DO NOTHING;
END $$;

DO $$
DECLARE
    v_creator_id uuid;
BEGIN
    SELECT tests.get_supabase_uid('project_creator@example.com') INTO v_creator_id;
    
    EXECUTE format('SET LOCAL ROLE authenticated; SET LOCAL "request.jwt.claims" = ''{"sub": "%s"}''', v_creator_id);
END $$;

SELECT ok(
  (SELECT (result->>'success')::boolean FROM (SELECT add_project('Test Project', 'test-repo', 'test-owner', 12345, 67890, '88888888-8888-8888-8888-888888888888') AS result) AS t),
  'Should return success = true'
);

SELECT ok(
  (SELECT result ? 'project_id' FROM (SELECT add_project('Test Project 2', 'test-repo-2', 'test-owner-2', 12346, 67891, '88888888-8888-8888-8888-888888888888') AS result) AS t),
  'Should include project_id key'
);

SELECT ok(
  (SELECT result ? 'repository_id' FROM (SELECT add_project('Test Project 3', 'test-repo-3', 'test-owner-3', 12347, 67892, '88888888-8888-8888-8888-888888888888') AS result) AS t),
  'Should include repository_id key'
);

SELECT is(
  (SELECT result->>'error' FROM (SELECT add_project('Test Project 4', 'test-repo-4', 'test-owner-4', 12348, 67893, '88888888-8888-8888-8888-888888888888') AS result) AS t),
  NULL,
  'Error should be null'
);

SELECT is(
  (SELECT COUNT(*) FROM projects WHERE name = 'Test Project' AND organization_id = '88888888-8888-8888-8888-888888888888'),
  1::bigint,
  'Should create a new project record'
);

SELECT is(
  (SELECT COUNT(*) FROM github_repositories WHERE name = 'test-repo' AND owner = 'test-owner' AND organization_id = '88888888-8888-8888-8888-888888888888'),
  1::bigint,
  'Should create a new github repository record'
);

SELECT is(
  (SELECT COUNT(*) FROM project_repository_mappings WHERE organization_id = '88888888-8888-8888-8888-888888888888'),
  4::bigint,
  'Should create project-repository mapping records'
);

SELECT is(
  (SELECT github_installation_identifier FROM github_repositories WHERE name = 'test-repo-2' AND owner = 'test-owner-2'),
  12346::bigint,
  'Should store correct github installation identifier'
);

SELECT is(
  (SELECT github_repository_identifier FROM github_repositories WHERE name = 'test-repo-3' AND owner = 'test-owner-3'),
  67892::bigint,
  'Should store correct github repository identifier'
);

SELECT ok(
  (SELECT COUNT(*) > 0 FROM project_repository_mappings prm
   JOIN projects p ON prm.project_id = p.id
   JOIN github_repositories gr ON prm.repository_id = gr.id
   WHERE p.name = 'Test Project 4' AND gr.name = 'test-repo-4'),
  'Project and repository should be correctly linked'
);

SELECT is(
  (SELECT add_project('Invalid Project', 'invalid-repo', 'invalid-owner', 99999, 88888, '99999999-9999-9999-9999-999999999999')),
  '{"success": false, "error": "insert or update on table \"projects\" violates foreign key constraint \"projects_organization_id_fkey\""}'::jsonb,
  'Should fail when organization does not exist'
);

SELECT ok(
  (SELECT NOT (result->>'success')::boolean FROM (SELECT add_project('Duplicate Repo Project', 'test-repo', 'test-owner', 12345, 67890, '88888888-8888-8888-8888-888888888888') AS result) AS t),
  'Should fail when creating duplicate github repository'
);

SELECT ok(
  (SELECT result ? 'error' FROM (SELECT add_project('Duplicate Repo Project 2', 'test-repo-2', 'test-owner-2', 12346, 67891, '88888888-8888-8888-8888-888888888888') AS result) AS t),
  'Should include error key when duplicate repository creation fails'
);

SELECT ok(
  (SELECT NOT (result->>'success')::boolean FROM (SELECT add_project(NULL, 'null-test-repo', 'null-test-owner', 11111, 22222, '88888888-8888-8888-8888-888888888888') AS result) AS t),
  'Should fail when project name is null'
);

SELECT ok(
  (SELECT COUNT(*) > 0 FROM projects p
   JOIN github_repositories gr ON p.organization_id = gr.organization_id
   WHERE p.name = 'Test Project' 
   AND p.created_at IS NOT NULL 
   AND p.updated_at IS NOT NULL
   AND gr.updated_at IS NOT NULL),
  'Should set all timestamps correctly'
);

RESET ROLE;

SELECT * FROM finish();

ROLLBACK;
