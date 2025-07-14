import type { TimelineItemEntry } from '../../../types'

/**
 * Generate unique timeline item ID
 */
export const generateTimelineItemId = (prefix: string): string => {
  return `${prefix}-${Date.now()}`
}

/**
 * Format timeline item history for API
 */
export const formatTimelineItemHistory = (
  timelineItems: TimelineItemEntry[],
): [string, string][] => {
  return timelineItems.map((item) => [
    item.type === 'user' ? 'Human' : 'AI',
    item.content,
  ])
}
