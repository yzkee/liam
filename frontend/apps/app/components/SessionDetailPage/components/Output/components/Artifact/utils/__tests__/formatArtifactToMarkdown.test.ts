import type { Artifact, DmlOperation } from '@liam-hq/artifact'
import { describe, expect, it } from 'vitest'
import { formatArtifactToMarkdown } from '../formatArtifactToMarkdown'

describe('formatArtifactToMarkdown', () => {
  describe('main function', () => {
    it('should format complete artifact with all sections', () => {
      const artifact: Artifact = {
        requirement_analysis: {
          business_requirement: 'Build an e-commerce platform',
          requirements: [
            {
              name: 'User Management',
              description: 'Users should be able to register and login',
              type: 'functional',
              use_cases: [
                {
                  title: 'User Registration',
                  description: 'New users can create an account',
                  dml_operations: [
                    {
                      useCaseId: 'uc-1',
                      operation_type: 'INSERT',
                      sql: 'INSERT INTO users (email, password) VALUES ($1, $2)',
                      description: 'Insert new user record',
                      dml_execution_logs: [
                        {
                          executed_at: '2024-01-15T10:30:00Z',
                          success: true,
                          result_summary: '1 row inserted',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              name: 'Performance',
              description: 'System should respond within 2 seconds',
              type: 'non_functional',
            },
          ],
        },
      }

      const result = formatArtifactToMarkdown(artifact)

      expect(result).toMatchInlineSnapshot(`
        "# Requirements Document

        This document outlines system requirements and their associated data manipulation language (DML) operations.

        ---

        ## 📋 Business Requirements

        Build an e-commerce platform

        ## 🔧 Functional Requirements

        ### 1. User Management

        Users should be able to register and login


        **Use Cases:**

        #### 1.1. User Registration

        New users can create an account

        **Related DML Operations:**

        **INSERT** - Insert new user record

        \`\`\`sql
        INSERT INTO users (email, password) VALUES ($1, $2)
        \`\`\`

        **Execution History:**

        ✅ **01/15/2024, 07:30:00 PM**
        > 1 row inserted



        ## 📊 Non-Functional Requirements

        ### 1. Performance

        System should respond within 2 seconds
        "
      `)
    })

    it('should handle artifact with only functional requirements', () => {
      const artifact: Artifact = {
        requirement_analysis: {
          business_requirement: 'Task management system',
          requirements: [
            {
              name: 'Task CRUD',
              description: 'Create, read, update, delete tasks',
              type: 'functional',
              use_cases: [],
            },
          ],
        },
      }

      const result = formatArtifactToMarkdown(artifact)

      expect(result).toContain('## 🔧 Functional Requirements')
      expect(result).not.toContain('## 📊 Non-Functional Requirements')
    })

    it('should handle artifact with only non-functional requirements', () => {
      const artifact: Artifact = {
        requirement_analysis: {
          business_requirement: 'System optimization',
          requirements: [
            {
              name: 'Security',
              description: 'All data must be encrypted',
              type: 'non_functional',
            },
          ],
        },
      }

      const result = formatArtifactToMarkdown(artifact)

      expect(result).not.toContain('## 🔧 Functional Requirements')
      expect(result).toContain('## 📊 Non-Functional Requirements')
    })

    it('should handle empty requirements array', () => {
      const artifact: Artifact = {
        requirement_analysis: {
          business_requirement: 'Empty project',
          requirements: [],
        },
      }

      const result = formatArtifactToMarkdown(artifact)

      expect(result).toContain('## 📋 Business Requirements')
      expect(result).toContain('Empty project')
      expect(result).not.toContain('## 🔧 Functional Requirements')
      expect(result).not.toContain('## 📊 Non-Functional Requirements')
    })

    it('should format multiple requirements with proper numbering', () => {
      const artifact: Artifact = {
        requirement_analysis: {
          business_requirement: 'Multi-requirement system',
          requirements: [
            {
              name: 'Feature A',
              description: 'Description A',
              type: 'functional',
              use_cases: [],
            },
            {
              name: 'Feature B',
              description: 'Description B',
              type: 'functional',
              use_cases: [],
            },
            {
              name: 'Requirement X',
              description: 'Description X',
              type: 'non_functional',
            },
            {
              name: 'Requirement Y',
              description: 'Description Y',
              type: 'non_functional',
            },
          ],
        },
      }

      const result = formatArtifactToMarkdown(artifact)

      expect(result).toMatch(/### 1\. Feature A[\s\S]*### 2\. Feature B/)
      expect(result).toMatch(
        /### 1\. Requirement X[\s\S]*### 2\. Requirement Y/,
      )
    })

    it('should add separators between functional requirements', () => {
      const artifact: Artifact = {
        requirement_analysis: {
          business_requirement: 'Test',
          requirements: [
            {
              name: 'First',
              description: 'First desc',
              type: 'functional',
              use_cases: [],
            },
            {
              name: 'Second',
              description: 'Second desc',
              type: 'functional',
              use_cases: [],
            },
          ],
        },
      }

      const result = formatArtifactToMarkdown(artifact)
      const lines = result.split('\n')

      const firstIndex = lines.findIndex((line) => line === '### 1. First')
      const secondIndex = lines.findIndex((line) => line === '### 2. Second')
      const separatorIndex = lines.findIndex(
        (line, index) =>
          index > firstIndex && index < secondIndex && line === '---',
      )

      expect(separatorIndex).toBeGreaterThan(firstIndex)
      expect(separatorIndex).toBeLessThan(secondIndex)
    })
  })

  describe('DML operation formatting', () => {
    it('should format operation with description', () => {
      const artifact: Artifact = {
        requirement_analysis: {
          business_requirement: 'Test',
          requirements: [
            {
              name: 'Test Feature',
              description: 'Test description',
              type: 'functional',
              use_cases: [
                {
                  title: 'Test Use Case',
                  description: 'Use case description',
                  dml_operations: [
                    {
                      useCaseId: 'uc-1',
                      operation_type: 'UPDATE',
                      sql: 'UPDATE users SET status = $1',
                      description: 'Update user status',
                      dml_execution_logs: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      }

      const result = formatArtifactToMarkdown(artifact)

      expect(result).toContain('**UPDATE** - Update user status')
      expect(result).toContain('```sql\nUPDATE users SET status = $1\n```')
    })

    it('should format operation without description', () => {
      const artifact: Artifact = {
        requirement_analysis: {
          business_requirement: 'Test',
          requirements: [
            {
              name: 'Test Feature',
              description: 'Test description',
              type: 'functional',
              use_cases: [
                {
                  title: 'Test Use Case',
                  description: 'Use case description',
                  dml_operations: [
                    {
                      useCaseId: 'uc-1',
                      operation_type: 'DELETE',
                      sql: 'DELETE FROM users WHERE id = $1',
                      dml_execution_logs: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      }

      const result = formatArtifactToMarkdown(artifact)

      expect(result).toContain('**DELETE**')
      expect(result).not.toContain('**DELETE** -')
    })

    it('should format successful execution logs', () => {
      const artifact: Artifact = {
        requirement_analysis: {
          business_requirement: 'Test',
          requirements: [
            {
              name: 'Test Feature',
              description: 'Test description',
              type: 'functional',
              use_cases: [
                {
                  title: 'Test Use Case',
                  description: 'Use case description',
                  dml_operations: [
                    {
                      useCaseId: 'uc-1',
                      operation_type: 'SELECT',
                      sql: 'SELECT * FROM users',
                      dml_execution_logs: [
                        {
                          executed_at: '2024-03-20T14:45:30Z',
                          success: true,
                          result_summary: '25 rows returned',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      }

      const result = formatArtifactToMarkdown(artifact)

      expect(result).toContain('**Execution History:**')
      expect(result).toContain('✅ **03/20/2024, 11:45:30 PM**')
      expect(result).toContain('> 25 rows returned')
    })

    it('should format failed execution logs', () => {
      const artifact: Artifact = {
        requirement_analysis: {
          business_requirement: 'Test',
          requirements: [
            {
              name: 'Test Feature',
              description: 'Test description',
              type: 'functional',
              use_cases: [
                {
                  title: 'Test Use Case',
                  description: 'Use case description',
                  dml_operations: [
                    {
                      useCaseId: 'uc-1',
                      operation_type: 'INSERT',
                      sql: 'INSERT INTO users (email) VALUES ($1)',
                      dml_execution_logs: [
                        {
                          executed_at: '2024-03-20T14:45:30Z',
                          success: false,
                          result_summary: 'Unique constraint violation',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      }

      const result = formatArtifactToMarkdown(artifact)

      expect(result).toContain('❌ **03/20/2024, 11:45:30 PM**')
      expect(result).toContain('> Unique constraint violation')
    })

    it('should format multiple execution logs', () => {
      const artifact: Artifact = {
        requirement_analysis: {
          business_requirement: 'Test',
          requirements: [
            {
              name: 'Test Feature',
              description: 'Test description',
              type: 'functional',
              use_cases: [
                {
                  title: 'Test Use Case',
                  description: 'Use case description',
                  dml_operations: [
                    {
                      useCaseId: 'uc-1',
                      operation_type: 'INSERT',
                      sql: 'INSERT INTO orders (user_id, total) VALUES ($1, $2)',
                      dml_execution_logs: [
                        {
                          executed_at: '2024-03-20T10:00:00Z',
                          success: false,
                          result_summary: 'Connection timeout',
                        },
                        {
                          executed_at: '2024-03-20T10:01:00Z',
                          success: true,
                          result_summary: '1 row inserted',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      }

      const result = formatArtifactToMarkdown(artifact)

      expect(result).toContain('❌ **03/20/2024, 07:00:00 PM**')
      expect(result).toContain('> Connection timeout')
      expect(result).toContain('✅ **03/20/2024, 07:01:00 PM**')
      expect(result).toContain('> 1 row inserted')
    })

    it('should not show execution section when no logs exist', () => {
      const artifact: Artifact = {
        requirement_analysis: {
          business_requirement: 'Test',
          requirements: [
            {
              name: 'Test Feature',
              description: 'Test description',
              type: 'functional',
              use_cases: [
                {
                  title: 'Test Use Case',
                  description: 'Use case description',
                  dml_operations: [
                    {
                      useCaseId: 'uc-1',
                      operation_type: 'SELECT',
                      sql: 'SELECT * FROM products',
                      dml_execution_logs: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      }

      const result = formatArtifactToMarkdown(artifact)

      expect(result).not.toContain('**Execution History:**')
    })

    it('should trim SQL whitespace', () => {
      const artifact: Artifact = {
        requirement_analysis: {
          business_requirement: 'Test',
          requirements: [
            {
              name: 'Test Feature',
              description: 'Test description',
              type: 'functional',
              use_cases: [
                {
                  title: 'Test Use Case',
                  description: 'Use case description',
                  dml_operations: [
                    {
                      useCaseId: 'uc-1',
                      operation_type: 'SELECT',
                      sql: '  \n  SELECT * FROM users  \n  ',
                      dml_execution_logs: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      }

      const result = formatArtifactToMarkdown(artifact)

      expect(result).toContain('```sql\nSELECT * FROM users\n```')
      expect(result).not.toContain('  SELECT')
    })
  })

  describe('use case formatting', () => {
    it('should format use case with single DML operation', () => {
      const artifact: Artifact = {
        requirement_analysis: {
          business_requirement: 'Test',
          requirements: [
            {
              name: 'Test Feature',
              description: 'Test description',
              type: 'functional',
              use_cases: [
                {
                  title: 'Single Operation Use Case',
                  description: 'This use case has one operation',
                  dml_operations: [
                    {
                      useCaseId: 'uc-1',
                      operation_type: 'INSERT',
                      sql: 'INSERT INTO logs (message) VALUES ($1)',
                      dml_execution_logs: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      }

      const result = formatArtifactToMarkdown(artifact)

      expect(result).toContain('#### 1.1. Single Operation Use Case')
      expect(result).toContain('This use case has one operation')
      expect(result).toContain('**Related DML Operations:**')
      expect(result).not.toContain('##### Operation 1')
    })

    it('should format use case with multiple DML operations', () => {
      const artifact: Artifact = {
        requirement_analysis: {
          business_requirement: 'Test',
          requirements: [
            {
              name: 'Test Feature',
              description: 'Test description',
              type: 'functional',
              use_cases: [
                {
                  title: 'Multi Operation Use Case',
                  description: 'This use case has multiple operations',
                  dml_operations: [
                    {
                      useCaseId: 'uc-1',
                      operation_type: 'INSERT',
                      sql: 'INSERT INTO orders (user_id) VALUES ($1)',
                      dml_execution_logs: [],
                    },
                    {
                      useCaseId: 'uc-1',
                      operation_type: 'UPDATE',
                      sql: 'UPDATE inventory SET quantity = quantity - 1',
                      dml_execution_logs: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      }

      const result = formatArtifactToMarkdown(artifact)

      expect(result).toContain('##### Operation 1')
      expect(result).toContain('##### Operation 2')
      expect(result).toContain('---')
      expect(result).toContain('INSERT INTO orders')
      expect(result).toContain('UPDATE inventory')
    })

    it('should format use case without DML operations', () => {
      const artifact: Artifact = {
        requirement_analysis: {
          business_requirement: 'Test',
          requirements: [
            {
              name: 'Test Feature',
              description: 'Test description',
              type: 'functional',
              use_cases: [
                {
                  title: 'No Operations Use Case',
                  description: 'This use case has no operations yet',
                  dml_operations: [],
                },
              ],
            },
          ],
        },
      }

      const result = formatArtifactToMarkdown(artifact)

      expect(result).toContain('#### 1.1. No Operations Use Case')
      expect(result).toContain('This use case has no operations yet')
      expect(result).not.toContain('**Related DML Operations:**')
    })

    it('should format multiple use cases with proper numbering', () => {
      const artifact: Artifact = {
        requirement_analysis: {
          business_requirement: 'Test',
          requirements: [
            {
              name: 'User Management',
              description: 'User management features',
              type: 'functional',
              use_cases: [
                {
                  title: 'User Registration',
                  description: 'Register new users',
                  dml_operations: [],
                },
                {
                  title: 'User Login',
                  description: 'Authenticate users',
                  dml_operations: [],
                },
                {
                  title: 'Password Reset',
                  description: 'Reset user password',
                  dml_operations: [],
                },
              ],
            },
          ],
        },
      }

      const result = formatArtifactToMarkdown(artifact)

      expect(result).toContain('#### 1.1. User Registration')
      expect(result).toContain('#### 1.2. User Login')
      expect(result).toContain('#### 1.3. Password Reset')
    })

    it('should handle complex nested structure', () => {
      const artifact: Artifact = {
        requirement_analysis: {
          business_requirement: 'Complex system',
          requirements: [
            {
              name: 'Feature 1',
              description: 'First feature',
              type: 'functional',
              use_cases: [
                {
                  title: 'UC 1.1',
                  description: 'First use case',
                  dml_operations: [],
                },
                {
                  title: 'UC 1.2',
                  description: 'Second use case',
                  dml_operations: [],
                },
              ],
            },
            {
              name: 'Feature 2',
              description: 'Second feature',
              type: 'functional',
              use_cases: [
                {
                  title: 'UC 2.1',
                  description: 'Third use case',
                  dml_operations: [],
                },
              ],
            },
          ],
        },
      }

      const result = formatArtifactToMarkdown(artifact)

      expect(result).toContain('### 1. Feature 1')
      expect(result).toContain('#### 1.1. UC 1.1')
      expect(result).toContain('#### 1.2. UC 1.2')
      expect(result).toContain('### 2. Feature 2')
      expect(result).toContain('#### 2.1. UC 2.1')
    })
  })

  describe('edge cases', () => {
    it('should handle all operation types', () => {
      const operations: DmlOperation[] = [
        {
          useCaseId: 'uc-1',
          operation_type: 'INSERT',
          sql: 'INSERT INTO test',
          dml_execution_logs: [],
        },
        {
          useCaseId: 'uc-2',
          operation_type: 'UPDATE',
          sql: 'UPDATE test',
          dml_execution_logs: [],
        },
        {
          useCaseId: 'uc-3',
          operation_type: 'DELETE',
          sql: 'DELETE FROM test',
          dml_execution_logs: [],
        },
        {
          useCaseId: 'uc-4',
          operation_type: 'SELECT',
          sql: 'SELECT * FROM test',
          dml_execution_logs: [],
        },
      ]

      const artifact: Artifact = {
        requirement_analysis: {
          business_requirement: 'Test all operations',
          requirements: [
            {
              name: 'Test Feature',
              description: 'Test all operation types',
              type: 'functional',
              use_cases: [
                {
                  title: 'All Operations',
                  description: 'Test all DML operation types',
                  dml_operations: operations,
                },
              ],
            },
          ],
        },
      }

      const result = formatArtifactToMarkdown(artifact)

      expect(result).toContain('**INSERT**')
      expect(result).toContain('**UPDATE**')
      expect(result).toContain('**DELETE**')
      expect(result).toContain('**SELECT**')
    })

    it('should handle very long text content gracefully', () => {
      const longDescription = 'A'.repeat(500)
      const longSQL = `SELECT ${'column,'.repeat(50)} FROM table`

      const artifact: Artifact = {
        requirement_analysis: {
          business_requirement: longDescription,
          requirements: [
            {
              name: 'Long Feature',
              description: longDescription,
              type: 'functional',
              use_cases: [
                {
                  title: 'Long Use Case',
                  description: longDescription,
                  dml_operations: [
                    {
                      useCaseId: 'uc-1',
                      operation_type: 'SELECT',
                      sql: longSQL,
                      description: longDescription,
                      dml_execution_logs: [
                        {
                          executed_at: '2024-01-01T00:00:00Z',
                          success: true,
                          result_summary: longDescription,
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      }

      const result = formatArtifactToMarkdown(artifact)

      expect(result).toContain(longDescription)
      expect(result).toContain(longSQL)
    })

    it('should preserve markdown-safe characters in content', () => {
      const artifact: Artifact = {
        requirement_analysis: {
          business_requirement: 'Special chars: * _ ` # [ ] ( ) ! < >',
          requirements: [
            {
              name: 'Special & Characters',
              description: 'Description with **bold** and _italic_ text',
              type: 'functional',
              use_cases: [
                {
                  title: 'Use Case [with brackets]',
                  description: 'Description with `code` and <tags>',
                  dml_operations: [
                    {
                      useCaseId: 'uc-1',
                      operation_type: 'SELECT',
                      sql: 'SELECT * FROM users WHERE name = "John\'s"',
                      description: 'Query with quotes & special chars',
                      dml_execution_logs: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      }

      const result = formatArtifactToMarkdown(artifact)

      expect(result).toContain('Special chars: * _ ` # [ ] ( ) ! < >')
      expect(result).toContain('Special & Characters')
      expect(result).toContain('**bold** and _italic_')
      expect(result).toContain('Use Case [with brackets]')
      expect(result).toContain('`code` and <tags>')
      expect(result).toContain('"John\'s"')
    })
  })
})
