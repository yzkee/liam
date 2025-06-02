import { safeParse } from 'valibot'
import { useSnapshot } from 'valtio'
import { schemaStoreSchema } from './schema'
import { schemaStore } from './store'

export const useSchemaStore = () => {
  const snapshot = useSnapshot(schemaStore)

  const result = safeParse(schemaStoreSchema, snapshot)

  if (!result.success) {
    throw new Error('Invalid schema store')
  }

  return result.output
}
