import { ReactFlowProvider } from '@xyflow/react'
import { NuqsAdapter } from 'nuqs/adapters/react'
import type { FC, PropsWithChildren } from 'react'
import { VersionProvider } from '../../../../../providers'
import type { ShowMode } from '../../../../../schemas'
import { SchemaProvider, type SchemaProviderValue } from '../../../../../stores'
import { UserEditingProvider } from '../../../../../stores/userEditing'

const mockVersion = {
  version: '1.0.0',
  gitHash: 'abc123def456',
  envName: 'storybook',
  date: '2024-01-01T00:00:00Z',
  displayedOn: 'web' as const,
}

type MockProvidersProps = PropsWithChildren & {
  schema: SchemaProviderValue
  showDiff?: boolean
  defaultShowMode?: ShowMode
}

export const MockProviders: FC<MockProvidersProps> = ({
  children,
  schema,
  showDiff = false,
  defaultShowMode = 'ALL_FIELDS',
}) => (
  <NuqsAdapter>
    <VersionProvider version={mockVersion}>
      <UserEditingProvider
        showDiff={showDiff}
        defaultShowMode={defaultShowMode}
      >
        <SchemaProvider {...schema}>
          <ReactFlowProvider>{children}</ReactFlowProvider>
        </SchemaProvider>
      </UserEditingProvider>
    </VersionProvider>
  </NuqsAdapter>
)
