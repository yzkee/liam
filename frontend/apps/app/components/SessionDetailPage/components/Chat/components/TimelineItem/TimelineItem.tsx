'use client'

import type { FC, PropsWithChildren } from 'react'
import { match } from 'ts-pattern'
import type { TimelineItemEntry } from '../../../../types'
import { AgentMessage } from './components/AgentMessage'
import { ErrorMessage } from './components/ErrorMessage'
import { LogMessage } from './components/LogMessage'
import { QueryResultMessage } from './components/QueryResultMessage'
import { UserMessage } from './components/UserMessage'
import { VersionMessage } from './components/VersionMessage'
import { ViewLink } from './components/ViewLink'
import {
  ARTIFACT_TRIGGER_MESSAGES,
  PM_AGENT_ROLE,
  QA_AGENT_ROLE,
} from './constants'

type Props = PropsWithChildren &
  TimelineItemEntry & {
    showHeader?: boolean
    onArtifactLinkClick?: () => void
  }

type AgentRole = typeof PM_AGENT_ROLE | typeof QA_AGENT_ROLE

type ViewLinkConfig = {
  text: string
}

type ViewLinkKey = `${AgentRole}:${string}`

const viewLinkConfigMap: Record<ViewLinkKey, ViewLinkConfig> = {
  [`${PM_AGENT_ROLE}:${ARTIFACT_TRIGGER_MESSAGES.REQUIREMENTS_ANALYZED}`]: {
    text: 'View Requirements',
  },
  [`${QA_AGENT_ROLE}:${ARTIFACT_TRIGGER_MESSAGES.USE_CASES_SAVED}`]: {
    text: 'View Use Cases',
  },
}

const isAgentRole = (role: string): role is AgentRole => {
  return role === PM_AGENT_ROLE || role === QA_AGENT_ROLE
}

const getViewLinkConfig = (
  content: string,
  role: string,
): ViewLinkConfig | null => {
  if (!isAgentRole(role)) {
    return null
  }

  const key: ViewLinkKey = `${role}:${content}`
  return viewLinkConfigMap[key] || null
}

export const TimelineItem: FC<Props> = (props) => {
  const { showHeader = true, onArtifactLinkClick, ...timelineItemProps } = props

  return match(timelineItemProps)
    .with({ type: 'schema_version' }, ({ buildingSchemaVersionId, onView }) => (
      <AgentMessage state="default" assistantRole="db" showHeader={showHeader}>
        <VersionMessage
          buildingSchemaVersionId={buildingSchemaVersionId}
          onView={onView}
        />
      </AgentMessage>
    ))
    .with({ type: 'query_result' }, ({ queryResultId, results }) => (
      <AgentMessage state="default" assistantRole="db" showHeader={showHeader}>
        <QueryResultMessage
          queryResultId={queryResultId}
          results={Array.isArray(results) ? results : undefined}
        />
      </AgentMessage>
    ))
    .with({ type: 'user' }, ({ content, timestamp, userName }) => (
      <UserMessage
        content={content}
        timestamp={timestamp}
        userName={userName}
      />
    ))
    .with({ type: 'assistant_log' }, ({ content, role }) => {
      const viewLinkConfig = getViewLinkConfig(content, role)
      return (
        <AgentMessage
          state="default"
          assistantRole={role}
          showHeader={showHeader}
        >
          <LogMessage content={content} />
          {viewLinkConfig && (
            <ViewLink
              text={viewLinkConfig.text}
              onClick={onArtifactLinkClick}
              ariaLabel={`Navigate to ${viewLinkConfig.text.toLowerCase()} tab`}
            />
          )}
        </AgentMessage>
      )
    })
    .with({ type: 'assistant' }, ({ content, role, timestamp, children }) => {
      const viewLinkConfig = getViewLinkConfig(content, role)
      return (
        <AgentMessage
          state="default"
          assistantRole={role}
          message={content}
          time={timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
          showHeader={showHeader}
        >
          {children}
          {viewLinkConfig && (
            <ViewLink
              text={viewLinkConfig.text}
              onClick={onArtifactLinkClick}
              ariaLabel={`Navigate to ${viewLinkConfig.text.toLowerCase()} tab`}
            />
          )}
        </AgentMessage>
      )
    })
    .with({ type: 'error' }, ({ content, onRetry }) => (
      <AgentMessage state="default" assistantRole="db" showHeader={showHeader}>
        <ErrorMessage message={content} onRetry={onRetry} />
      </AgentMessage>
    ))
    .exhaustive()
}
