'use client'

import { type FC, useActionState } from 'react'
import { createUploadSession } from './actions/createUploadSession'
import { UploadSessionFormPresenter } from './UploadSessionFormPresenter'

type Props = Record<string, never>

export const UploadSessionForm: FC<Props> = () => {
  const [state, formAction, isPending] = useActionState(createUploadSession, {
    success: false,
  })

  return (
    <UploadSessionFormPresenter
      formError={state.error}
      isPending={isPending}
      formAction={formAction}
      isTransitioning={false}
    />
  )
}
