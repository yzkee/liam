import { Fit, Layout, useRive } from '@rive-app/react-canvas'
import type { FC } from 'react'
import styles from './OutputPlaceholder.module.css'

const baseUrl = () => {
  switch (process.env.NEXT_PUBLIC_ENV_NAME) {
    case 'production':
      return process.env.NEXT_PUBLIC_BASE_URL // NEXT_PUBLIC_BASE_URL includes "https://"
    case 'preview':
      return `https://${process.env.VERCEL_BRANCH_URL}` // VERCEL_BRANCH_URL does not include "https://"
    default:
      return 'http://localhost:3001'
  }
}

const RiveComponent = () => {
  const { RiveComponent } = useRive({
    src: `${baseUrl()}/assets/loading_jack.riv`,
    stateMachines: 'State Machine 1',
    layout: new Layout({
      fit: Fit.Contain,
    }),
    autoplay: true,
  })

  return <RiveComponent />
}

export const OutputPlaceholder: FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.riveWrapper}>
          <RiveComponent />
        </div>
        <div className={styles.previewText}>
          Your preview will appear here...
        </div>
      </div>
    </div>
  )
}
