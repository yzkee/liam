import type { CheckpointSaverTestInitializer } from '@langchain/langgraph-checkpoint-validation'
import { validate } from '@langchain/langgraph-checkpoint-validation'
import { createClient } from '@liam-hq/db'
import { describe } from 'vitest'
import { SupabaseCheckpointSaver } from './SupabaseCheckpointSaver'

// Test database configuration - use local development environment variables
const SUPABASE_URL =
  process.env['NEXT_PUBLIC_SUPABASE_URL'] || 'http://localhost:54321'
const SUPABASE_SERVICE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY'] || ''

const createTestClient = () => createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const clearOrganizationData = async (
  client: ReturnType<typeof createTestClient>,
  organizationId: string,
) => {
  await client
    .from('checkpoint_writes')
    .delete()
    .eq('organization_id', organizationId)

  await client
    .from('checkpoint_blobs')
    .delete()
    .eq('organization_id', organizationId)

  await client
    .from('checkpoints')
    .delete()
    .eq('organization_id', organizationId)
}

const getOrganizationId = async () => {
  const client = createTestClient()
  const { data, error } = await client
    .from('organizations')
    .select('id')
    .eq('name', 'liam-hq')
    .single()

  if (error) {
    throw error
  }

  return data.id
}

const supabaseCheckpointerInitializer: CheckpointSaverTestInitializer<SupabaseCheckpointSaver> =
  {
    checkpointerName: 'SupabaseCheckpointSaver',

    async beforeAll() {
      const client = createTestClient()
      const organizationId = await getOrganizationId()
      await clearOrganizationData(client, organizationId)
    },

    async afterAll() {},

    async createCheckpointer() {
      const organizationId = await getOrganizationId()
      const client = createTestClient()
      await clearOrganizationData(client, organizationId)
      return new SupabaseCheckpointSaver({
        client,
        options: { organizationId },
      })
    },

    async destroyCheckpointer(_checkpointer: SupabaseCheckpointSaver) {},
  }

// LangGraph Official Validation Tests
describe('LangGraph Official Validation', () => {
  validate(supabaseCheckpointerInitializer)
})
