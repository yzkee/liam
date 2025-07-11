import { err, ok, type Result } from 'neverthrow'
import { useContext } from 'react'
import { UserEditingContext, type UserEditingContextValue } from './context'

export const useUserEditing = (): Result<UserEditingContextValue, Error> => {
  const userEditing = useContext(UserEditingContext)
  if (!userEditing) {
    return err(
      new Error('useUserEditing must be used within a UserEditingProvider'),
    )
  }

  return ok(userEditing)
}
