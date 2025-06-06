export const AFTER = {
  tables: {
    heineken: {
      name: 'heineken',
      columns: {
        id: {
          name: 'id',
          type: 'uuid',
          default: null,
          check: null,
          primary: true,
          unique: false,
          notNull: true,
          comment: 'Primary key of the table',
        },
        path: {
          name: 'path',
          type: 'text',
          default: null,
          check: null,
          primary: false,
          unique: false,
          notNull: true,
          comment: 'Path to the document file',
        },
        is_review_enabled: {
          name: 'is_review_enabled',
          type: 'bool',
          default: false,
          check: null,
          primary: false,
          unique: false,
          notNull: true,
          comment: 'Whether review is enabled for this file',
        },
        project_id: {
          name: 'project_id',
          type: 'uuid',
          default: null,
          check: null,
          primary: false,
          unique: false,
          notNull: true,
          comment: 'Foreign key to projects table',
        },
        created_at: {
          name: 'created_at',
          type: 'timestamptz',
          default: 'now()',
          check: null,
          primary: false,
          unique: false,
          notNull: true,
          comment: 'Creation timestamp',
        },
        updated_at: {
          name: 'updated_at',
          type: 'timestamptz',
          default: 'now()',
          check: null,
          primary: false,
          unique: false,
          notNull: true,
          comment: 'Last update timestamp',
        },
        organization_id: {
          name: 'organization_id',
          type: 'uuid',
          default: null,
          check: null,
          primary: false,
          unique: false,
          notNull: true,
          comment: 'Foreign key to organizations table',
        },
        last_reviewed_at: {
          name: 'last_reviewed_at',
          type: 'timestamptz',
          default: null,
          check: null,
          primary: false,
          unique: false,
          notNull: false,
          comment: 'Timestamp of the last review',
        },
      },
      comment: null,
      indexes: {},
      constraints: {},
    },
    doc_file_paths: {
      name: 'doc_file_paths',
      columns: {
        id: {
          name: 'id',
          type: 'uuid',
          default: null,
          check: null,
          primary: true,
          unique: false,
          notNull: true,
          comment: 'Primary key of the table',
        },
        path: {
          name: 'path',
          type: 'text',
          default: null,
          check: null,
          primary: false,
          unique: false,
          notNull: true,
          comment: 'Path to the document file',
        },
        is_review_enabled: {
          name: 'is_review_enabled',
          type: 'bool',
          default: false,
          check: null,
          primary: false,
          unique: false,
          notNull: true,
          comment: 'Whether review is enabled for this file',
        },
        project_id: {
          name: 'project_id',
          type: 'uuid',
          default: null,
          check: null,
          primary: false,
          unique: false,
          notNull: true,
          comment: 'Foreign key to projects table',
        },
        created_at: {
          name: 'created_at',
          type: 'timestamptz',
          default: 'now()',
          check: null,
          primary: false,
          unique: false,
          notNull: true,
          comment: 'Creation timestamp',
        },
        updated_at: {
          name: 'updated_at',
          type: 'timestamptz',
          default: 'now()',
          check: null,
          primary: false,
          unique: false,
          notNull: true,
          comment: 'Last update timestamp',
        },
        organization_id: {
          name: 'organization_id',
          type: 'uuid',
          default: null,
          check: null,
          primary: false,
          unique: false,
          notNull: true,
          comment: 'Foreign key to organizations table',
        },
        last_reviewed_at: {
          name: 'last_reviewed_at',
          type: 'timestamptz',
          default: null,
          check: null,
          primary: false,
          unique: false,
          notNull: false,
          comment: 'Timestamp of the last review',
        },
      },
      comment: 'Stores paths to documentation files',
      indexes: {
        doc_file_path_path_project_id_key: {
          name: 'doc_file_path_path_project_id_key',
          unique: true,
          columns: ['path', 'project_id'],
          type: 'btree',
        },
        doc_file_path_organization_id_idx: {
          name: 'doc_file_path_organization_id_idx',
          unique: false,
          columns: ['organization_id'],
          type: 'btree',
        },
      },
      constraints: {
        github_doc_file_path_project_id_fkey: {
          type: 'FOREIGN KEY',
          name: 'github_doc_file_path_project_id_fkey',
          columnName: 'project_id',
          targetTableName: 'projects',
          targetColumnName: 'id',
          updateConstraint: 'CASCADE',
          deleteConstraint: 'RESTRICT',
        },
        doc_file_paths_pkey: {
          type: 'PRIMARY KEY',
          name: 'doc_file_paths_pkey',
          columnName: 'id',
        },
      },
    },
    github_repositories: {
      name: 'github_repositories',
      columns: {
        id: {
          name: 'id',
          type: 'uuid',
          default: null,
          check: null,
          primary: true,
          unique: false,
          notNull: true,
          comment: 'Primary key of the table',
        },
        name: {
          name: 'name',
          type: 'text',
          default: null,
          check: null,
          primary: false,
          unique: false,
          notNull: true,
          comment: 'Repository name',
        },
        owner: {
          name: 'owner',
          type: 'text',
          default: null,
          check: null,
          primary: false,
          unique: false,
          notNull: true,
          comment: 'Repository owner',
        },
        github_installation_identifier: {
          name: 'github_installation_identifier',
          type: 'int4',
          default: null,
          check: null,
          primary: false,
          unique: false,
          notNull: true,
          comment: 'GitHub installation identifier',
        },
        created_at: {
          name: 'created_at',
          type: 'timestamptz',
          default: 'now()',
          check: null,
          primary: false,
          unique: false,
          notNull: true,
          comment: 'Creation timestamp',
        },
        updated_at: {
          name: 'updated_at',
          type: 'timestamptz',
          default: 'now()',
          check: null,
          primary: false,
          unique: false,
          notNull: true,
          comment: 'Last update timestamp',
        },
        github_repository_identifier: {
          name: 'github_repository_identifier',
          type: 'int8',
          default: null,
          check: null,
          primary: false,
          unique: false,
          notNull: true,
          comment: 'GitHub repository identifier',
        },
        organization_id: {
          name: 'organization_id',
          type: 'uuid',
          default: null,
          check: null,
          primary: false,
          unique: false,
          notNull: true,
          comment: 'Foreign key to organizations table',
        },
        description: {
          name: 'description',
          type: 'text',
          default: null,
          check: null,
          primary: false,
          unique: false,
          notNull: false,
          comment: 'Repository description',
        },
        is_private: {
          name: 'is_private',
          type: 'bool',
          default: false,
          check: null,
          primary: false,
          unique: false,
          notNull: true,
          comment: 'Whether the repository is private',
        },
      },
      comment: 'Stores GitHub repositories',
      indexes: {
        github_repository_owner_name_key: {
          name: 'github_repository_owner_name_key',
          unique: true,
          columns: ['owner', 'name'],
          type: 'btree',
        },
        github_repositories_organization_id_idx: {
          name: 'github_repositories_organization_id_idx',
          unique: false,
          columns: ['organization_id'],
          type: 'btree',
        },
      },
      constraints: {
        github_repositories_organization_id_fkey: {
          type: 'FOREIGN KEY',
          name: 'github_repositories_organization_id_fkey',
          columnName: 'organization_id',
          targetTableName: 'organizations',
          targetColumnName: 'id',
          updateConstraint: 'CASCADE',
          deleteConstraint: 'RESTRICT',
        },
        github_repositories_pkey: {
          type: 'PRIMARY KEY',
          name: 'github_repositories_pkey',
          columnName: 'id',
        },
      },
    },
    organizations: {
      name: 'organizations',
      columns: {
        id: {
          name: 'id',
          type: 'uuid',
          default: null,
          check: null,
          primary: true,
          unique: false,
          notNull: true,
          comment: 'Primary key of the table',
        },
        name: {
          name: 'name',
          type: 'text',
          default: null,
          check: null,
          primary: false,
          unique: false,
          notNull: true,
          comment: 'Organization name',
        },
        created_at: {
          name: 'created_at',
          type: 'timestamptz',
          default: 'now()',
          check: null,
          primary: false,
          unique: false,
          notNull: true,
          comment: 'Creation timestamp',
        },
        updated_at: {
          name: 'updated_at',
          type: 'timestamptz',
          default: 'now()',
          check: null,
          primary: false,
          unique: false,
          notNull: true,
          comment: 'Last update timestamp',
        },
        description: {
          name: 'description',
          type: 'text',
          default: null,
          check: null,
          primary: false,
          unique: false,
          notNull: false,
          comment: 'Organization description',
        },
      },
      comment: 'Stores organizations',
      indexes: {},
      constraints: {
        organizations_pkey: {
          type: 'PRIMARY KEY',
          name: 'organizations_pkey',
          columnName: 'id',
        },
      },
    },
    projects: {
      name: 'projects',
      columns: {
        id: {
          name: 'id',
          type: 'uuid',
          default: null,
          check: null,
          primary: true,
          unique: false,
          notNull: true,
          comment: 'Primary key of the table',
        },
        name: {
          name: 'name',
          type: 'text',
          default: null,
          check: null,
          primary: false,
          unique: false,
          notNull: true,
          comment: 'Project name',
        },
        created_at: {
          name: 'created_at',
          type: 'timestamptz',
          default: 'now()',
          check: null,
          primary: false,
          unique: false,
          notNull: true,
          comment: 'Creation timestamp',
        },
        updated_at: {
          name: 'updated_at',
          type: 'timestamptz',
          default: 'now()',
          check: null,
          primary: false,
          unique: false,
          notNull: true,
          comment: 'Last update timestamp',
        },
        organization_id: {
          name: 'organization_id',
          type: 'uuid',
          default: null,
          check: null,
          primary: false,
          unique: false,
          notNull: true,
          comment: 'Foreign key to organizations table',
        },
        description: {
          name: 'description',
          type: 'text',
          default: null,
          check: null,
          primary: false,
          unique: false,
          notNull: false,
          comment: 'Project description',
        },
        is_active: {
          name: 'is_active',
          type: 'bool',
          default: true,
          check: null,
          primary: false,
          unique: false,
          notNull: true,
          comment: 'Whether the project is active',
        },
      },
      comment: 'Stores projects',
      indexes: {
        idx_project_organization_id: {
          name: 'idx_project_organization_id',
          unique: false,
          columns: ['organization_id'],
          type: 'btree',
        },
      },
      constraints: {
        project_organization_id_fkey: {
          type: 'FOREIGN KEY',
          name: 'project_organization_id_fkey',
          columnName: 'organization_id',
          targetTableName: 'organizations',
          targetColumnName: 'id',
          updateConstraint: 'CASCADE',
          deleteConstraint: 'CASCADE',
        },
        projects_pkey: {
          type: 'PRIMARY KEY',
          name: 'projects_pkey',
          columnName: 'id',
        },
      },
    },
    users: {
      name: 'users',
      columns: {
        id: {
          name: 'id',
          type: 'uuid',
          default: null,
          check: null,
          primary: true,
          unique: false,
          notNull: true,
          comment: 'Primary key of the table',
        },
        name: {
          name: 'name',
          type: 'text',
          default: null,
          check: null,
          primary: false,
          unique: false,
          notNull: true,
          comment: 'User name',
        },
        email: {
          name: 'email',
          type: 'text',
          default: null,
          check: null,
          primary: false,
          unique: true,
          notNull: true,
          comment: 'User email',
        },
        created_at: {
          name: 'created_at',
          type: 'timestamptz',
          default: 'now()',
          check: null,
          primary: false,
          unique: false,
          notNull: true,
          comment: 'Creation timestamp',
        },
        updated_at: {
          name: 'updated_at',
          type: 'timestamptz',
          default: 'now()',
          check: null,
          primary: false,
          unique: false,
          notNull: true,
          comment: 'Last update timestamp',
        },
        is_active: {
          name: 'is_active',
          type: 'bool',
          default: true,
          check: null,
          primary: false,
          unique: false,
          notNull: true,
          comment: 'Whether the user is active',
        },
        last_login_at: {
          name: 'last_login_at',
          type: 'timestamptz',
          default: null,
          check: null,
          primary: false,
          unique: false,
          notNull: false,
          comment: 'Timestamp of the last login',
        },
      },
      comment: 'Stores user information',
      indexes: {
        users_email_idx: {
          name: 'users_email_idx',
          unique: true,
          columns: ['email'],
          type: 'btree',
        },
      },
      constraints: {
        users_pkey: {
          type: 'PRIMARY KEY',
          name: 'users_pkey',
          columnName: 'id',
        },
      },
    },
  },
  relationships: {
    doc_file_paths_organization_id_fkey: {
      name: 'doc_file_paths_organization_id_fkey',
      primaryTableName: 'organizations',
      primaryColumnName: 'id',
      foreignTableName: 'doc_file_paths',
      foreignColumnName: 'organization_id',
      cardinality: 'ONE_TO_MANY',
      updateConstraint: 'CASCADE',
      deleteConstraint: 'RESTRICT',
    },
    github_doc_file_path_project_id_fkey: {
      name: 'github_doc_file_path_project_id_fkey',
      primaryTableName: 'projects',
      primaryColumnName: 'id',
      foreignTableName: 'doc_file_paths',
      foreignColumnName: 'project_id',
      cardinality: 'ONE_TO_MANY',
      updateConstraint: 'CASCADE',
      deleteConstraint: 'RESTRICT',
    },
    github_repositories_organization_id_fkey: {
      name: 'github_repositories_organization_id_fkey',
      primaryTableName: 'organizations',
      primaryColumnName: 'id',
      foreignTableName: 'github_repositories',
      foreignColumnName: 'organization_id',
      cardinality: 'ONE_TO_MANY',
      updateConstraint: 'CASCADE',
      deleteConstraint: 'RESTRICT',
    },
    project_organization_id_fkey: {
      name: 'project_organization_id_fkey',
      primaryTableName: 'organizations',
      primaryColumnName: 'id',
      foreignTableName: 'projects',
      foreignColumnName: 'organization_id',
      cardinality: 'ONE_TO_MANY',
      updateConstraint: 'CASCADE',
      deleteConstraint: 'CASCADE',
    },
  },
  tableGroups: {
    organization: {
      name: 'organization',
      tables: ['organizations', 'users'],
    },
    repositories: {
      name: 'repositories',
      tables: ['github_repositories', 'projects'],
    },
    documentation: {
      name: 'documentation',
      tables: ['doc_file_paths'],
    },
  },
} as const
