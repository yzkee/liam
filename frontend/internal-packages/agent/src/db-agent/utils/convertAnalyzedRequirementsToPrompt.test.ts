import { describe, expect, it } from 'vitest'
import type { AnalyzedRequirements } from '../../utils/schema/analyzedRequirements'
import { convertRequirementsToPrompt } from './convertAnalyzedRequirementsToPrompt'

describe('convertAnalyzedRequirementsToPrompt', () => {
  it('should convert analyzed requirements to formatted text prompt', () => {
    const analyzedRequirements: AnalyzedRequirements = {
      businessRequirement: 'Build a user management system',
      functionalRequirements: {
        authentication: ['Login', 'Logout', 'Password reset'],
        userManagement: ['Create user', 'Update user', 'Delete user'],
      },
      nonFunctionalRequirements: {
        security: ['Password encryption', 'Session management'],
        performance: ['Fast response times'],
      },
    }

    const result = convertRequirementsToPrompt(analyzedRequirements)

    expect(result).toMatchInlineSnapshot(`
      "Business Requirement: Build a user management system

      Functional Requirements:
      - authentication: Login, Logout, Password reset
      - userManagement: Create user, Update user, Delete user

      Non-Functional Requirements:
      - security: Password encryption, Session management
      - performance: Fast response times"
    `)
  })

  it('should handle empty requirements objects', () => {
    const analyzedRequirements: AnalyzedRequirements = {
      businessRequirement: 'Simple system',
      functionalRequirements: {},
      nonFunctionalRequirements: {},
    }

    const result = convertRequirementsToPrompt(analyzedRequirements)

    expect(result).toMatchInlineSnapshot(`
      "Business Requirement: Simple system

      Functional Requirements:


      Non-Functional Requirements:"
    `)
  })

  it('should handle empty business requirement', () => {
    const analyzedRequirements: AnalyzedRequirements = {
      businessRequirement: '',
      functionalRequirements: {
        basic: ['feature1'],
      },
      nonFunctionalRequirements: {
        quality: ['reliable'],
      },
    }

    const result = convertRequirementsToPrompt(analyzedRequirements)

    expect(result).toMatchInlineSnapshot(`
      "Business Requirement: 

      Functional Requirements:
      - basic: feature1

      Non-Functional Requirements:
      - quality: reliable"
    `)
  })
})
