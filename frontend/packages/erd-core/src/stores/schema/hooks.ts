import { err, ok, Result } from 'neverthrow'
import { useContext } from 'react'
import { SchemaContext, type SchemaContextValue } from './context'

export const useSchema = (): Result<SchemaContextValue, Error> => {
  const schema = useContext(SchemaContext)
  if (!schema)
    return err(new Error('useSchema must be used within SchemaProvider'))

  return ok(schema)
}
