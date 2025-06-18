import type { TimelineItemProps } from '../../TimelineItem/TimelineItem'

/**
 * Represents a timeline item entry with additional metadata
 */
export type TimelineItemEntry = TimelineItemProps & {
  /** Unique identifier for the timeline item */
  id: string
}
