import type { ReviewComment } from './types'

export const SCHEMA_UPDATES_DOC = `-- usersテーブルにupdated_atカラムを追加
alter table users add column updated_at timestamp with time zone default now();
comment on column users.updated_at is 'Record update timestamp';

-- projectsテーブルを作成
create table projects (
  id bigint primary key generated always as identity,
  name text not null,
  description text,
  owner_id bigint not null references users (id) on delete cascade,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

comment on table projects is 'Projects table';
comment on column projects.id is 'Primary key for projects table';
comment on column projects.name is 'Project name';
comment on column projects.description is 'Project description';
comment on column projects.owner_id is 'Project owner user ID';
comment on column projects.created_at is 'Record creation timestamp';
comment on column projects.updated_at is 'Record update timestamp';

-- インデックスを作成
create index idx_projects_owner_id on projects (owner_id);

-- v2: タスク管理機能を追加
-- projectsテーブルにstatusカラムを追加
alter table projects add column status text not null default 'active';
alter table projects add constraint projects_status_check 
  check (status in ('active', 'completed', 'archived'));
comment on column projects.status is 'Project status';

-- 外部キー制約を変更（より安全に）
alter table projects drop constraint projects_owner_id_fkey;
alter table projects add constraint projects_owner_id_fkey 
  foreign key (owner_id) references users (id) on delete restrict;

-- tasksテーブルを作成
create table tasks (
  id bigint primary key generated always as identity,
  title text not null,
  description text,
  project_id bigint not null references projects (id) on delete cascade,
  assignee_id bigint references users (id) on delete set null,
  status text not null default 'pending',
  priority integer not null default 3,
  due_date date,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint tasks_status_check 
    check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  constraint tasks_priority_check 
    check (priority >= 1 and priority <= 5)
);

comment on table tasks is 'Tasks table';
comment on column tasks.id is 'Primary key for tasks table';
comment on column tasks.title is 'Task title';
comment on column tasks.description is 'Task description';
comment on column tasks.project_id is 'Associated project ID';
comment on column tasks.assignee_id is 'Assigned user ID';
comment on column tasks.status is 'Task status';
comment on column tasks.priority is 'Task priority (1: highest, 5: lowest)';
comment on column tasks.due_date is 'Task due date';
comment on column tasks.created_at is 'Record creation timestamp';
comment on column tasks.updated_at is 'Record update timestamp';

-- インデックスを作成
create index idx_tasks_project_id on tasks (project_id);
create index idx_tasks_assignee_id on tasks (assignee_id);
create index idx_tasks_status on tasks (status);
create index idx_tasks_due_date on tasks (due_date);
create index idx_projects_status on projects (status);
`

export const SCHEMA_UPDATES_REVIEW_COMMENTS: ReviewComment[] = [
  {
    fromLine: 8,
    toLine: 9,
    severity: 'High' as const,
    message:
      '外部キー制約の変更は既存データに影響を与える可能性があります。運用環境では慎重にマイグレーションを実行してください。',
  },
  {
    fromLine: 24,
    toLine: 26,
    severity: 'Medium' as const,
    message:
      'CHECK制約により不正なデータの挿入は防げますが、アプリケーション側でも同様の検証を実装することを推奨します。',
  },
  {
    fromLine: 39,
    toLine: 42,
    severity: 'Low' as const,
    message:
      'インデックスが適切に設定されています。タスクの検索性能が向上します。',
  },
  {
    fromLine: 15,
    toLine: 15,
    severity: 'Medium' as const,
    message:
      'assignee_idがNULLの場合、未割り当てタスクとして扱われます。この仕様がビジネス要件と一致しているか確認してください。',
  },
]

export const ARTIFACT_DOC = `## 全体分析

このデータベース設計は、アプリケーションの説明から抽出されたビジネス要件と機能要件を満たしています。設計は、アプリケーションの説明、要件の抽出、データベース設計の生成、検証結果の保存など、すべての主要な機能をサポートしています。各テーブルは適切に正規化されており、必要なリレーションシップが確立されています。

## ビジネス要件と検証結果

### BR1

ユーザーがアプリケーションの説明を入力し、データベース設計を生成できること

#### 検証結果

applicationsテーブルがユーザーのアプリケーション説明を保存し、database_designsテーブルが生成されたデータベース設計を保存します。

##### 関連テーブル

- applications
- database_designs

<details><summary>DMLサンプルを表示</summary>
<p>

\`\`\`sql
INSERT INTO applications (id, description)
VALUES
  ('123e4567-e89b-12d3-a456-426614174000', 'Eコマースプラットフォームの開発');
\`\`\`

</p>
</details>

## 機能要件と検証結果

### FR1

ユーザーがアプリケーションの説明を入力するフォームを提供すること

#### 検証結果

##### 関連テーブル

- applications

<details><summary>DMLサンプルを表示</summary>
<p>

\`\`\`sql
SELECT id, description, created_at, updated_at
FROM applications
WHERE id = '123e4567-e89b-12d3-a456-426614174000';
\`\`\`

</p>
</details>

## DB Design Review

### Migration Safety

severity:Medium

DDL はすべて **CREATE TABLE** で破壊的操作は含まず安全性は高め。
ただし **トランザクション境界の宣言** がないため、大量データの後続マイグレーション（カラム追加＋データ移行など）を含める場合は **BEGIN … COMMIT;** でラップし、ツール (Sqitch, Rails migrations, golang-migrate 等) の **fail-fast & auto-rollback** 機構を必ず使うことを推奨。

### Data Integrity

severity:Low

すべての FK に **参照整合性制約** を設定、UNIQUE (channel_id, user_id) など重複防止も OK。
ソフトデリート採用で履歴保持の要件を満たす。
今後のリリースで **NOT NULL -> NULLABLE 変更** が発生する場合は ① バックフィル ② 制約緩和 の 2 ステップに分割する "expand-migrate-contract" 戦略が安全。

### Performance Impact

severity:Medium

読み取り系は主要 FK & 検索キーにインデックスを付与しておりベースラインとしては良好。
**messages テーブルの肥大化** がボトルネックになりやすい。メンテ予定があるなら PARTITION BY HASH (channel_id) など水平パーティションを検討。
message_reactions の高頻度書き込みは **UNIQUE (message_id, user_id, emoji)** が競合になり得るため、同一キーに対して "INSERT … ON CONFLICT" を利用し **UPSERT** 設計を確認。

### Security or Scalability

severity:Medium

**Security:** 現状パスワードカラムはなく、OAuth 連携等で外部認証を想定しているため平文パスワード保存リスクなし。
**RBAC** を拡張する場合、channel_memberships.role 以外に **行レベルセキュリティ (RLS)** を導入し、プライベートチャンネルを DB レイヤで強制する設計も視野に。
**Scalability:** 全テーブルとも BIGINT 主キーで 2^63-1 件まで対応。将来的に 1 テーブル 10^9 行級となる場合は、
1) **Auto-VACUUM / REINDEX ポリシー** の調整
2) **論理レプリケーション + リードレプリカ分散**
3) messages のパーティション or ショーディング
を計画段階でロードマップ化しておくと安心。

### Project Rules Consistency

severity:Low

すべて **snake_case**・名詞複数形・created_at / updated_at / deleted_at のタイムスタンプ列を採用。
既存ドキュメントで指定されている接頭辞・型ポリシーと一致しているため問題なし。
`
