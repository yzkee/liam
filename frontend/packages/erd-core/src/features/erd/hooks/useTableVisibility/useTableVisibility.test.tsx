import { renderHook } from '@testing-library/react'
import { type Node, ReactFlowProvider } from '@xyflow/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useTableVisibility } from './useTableVisibility'

const mockDefaultNodes = vi.fn<() => Node[]>()

const wrapper = ({ children }: { children: ReactNode }) => (
  <ReactFlowProvider defaultNodes={mockDefaultNodes()}>
    {children}
  </ReactFlowProvider>
)

describe('visibilityStatus', () => {
  it('should be "all-hidden" when all table nodes are hidden', () => {
    mockDefaultNodes.mockReturnValueOnce([
      {
        id: '1',
        type: 'table',
        data: {},
        position: { x: 0, y: 0 },
        hidden: true,
      },
      {
        id: '2',
        type: 'table',
        data: {},
        position: { x: 0, y: 0 },
        hidden: true,
      },
    ])

    const { result } = renderHook(() => useTableVisibility(), { wrapper })

    expect(result.current.visibilityStatus).toBe('all-hidden')
  })

  it('should be "all-visible" when all table nodes are visible', () => {
    mockDefaultNodes.mockReturnValueOnce([
      {
        id: '1',
        type: 'table',
        data: {},
        position: { x: 0, y: 0 },
        hidden: false,
      },
      {
        id: '2',
        type: 'table',
        data: {},
        position: { x: 0, y: 0 },
        hidden: false,
      },
    ])

    const { result } = renderHook(() => useTableVisibility(), { wrapper })

    expect(result.current.visibilityStatus).toBe('all-visible')
  })

  it('should be "partially-visible" when some table nodes are hidden and the others are visible', () => {
    mockDefaultNodes.mockReturnValueOnce([
      {
        id: '1',
        type: 'table',
        data: {},
        position: { x: 0, y: 0 },
        hidden: true,
      },
      {
        id: '2',
        type: 'table',
        data: {},
        position: { x: 0, y: 0 },
        hidden: false,
      },
    ])

    const { result } = renderHook(() => useTableVisibility(), { wrapper })

    expect(result.current.visibilityStatus).toBe('partially-visible')
  })
})
