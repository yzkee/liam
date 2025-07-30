'use client'

import { type FC, useActionState } from 'react'
import { createUrlSession } from '../../actions/createUrlSession'
import { URLSessionFormPresenter } from './URLSessionFormPresenter'

type Props = Record<string, never>

export const UrlSessionForm: FC<Props> = () => {
  const [state, formAction, isPending] = useActionState(createUrlSession, {
    success: false,
  })

  return (
    <URLSessionFormPresenter
      formError={state.error}
      isPending={isPending}
      formAction={formAction}
      isTransitioning={false}
    />
  )
}
