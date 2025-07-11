import { describe, expect, it } from 'vitest'
import type { TimelineItemEntry } from '../../../../types'
import { formatTimelineItemHistory } from '../timelineItemHelpers'

describe('timelineItemHelpers', () => {
  describe('formatTimelineItemHistory', () => {
    it('should format timeline items for API', () => {
      const timelineItems: TimelineItemEntry[] = [
        {
          id: '1',
          type: 'user',
          content: 'Hello',
          timestamp: new Date(),
        },
        {
          id: '2',
          type: 'assistant',
          content: 'Hi there!',
          timestamp: new Date(),
        },
      ]

      const result = formatTimelineItemHistory(timelineItems)

      expect(result).toEqual([
        ['Human', 'Hello'],
        ['AI', 'Hi there!'],
      ])
    })
  })
})
