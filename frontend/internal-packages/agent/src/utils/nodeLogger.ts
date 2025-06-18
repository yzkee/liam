// NodeLogger is defined for use with Trigger.dev logging.
export type NodeLogger = {
  debug: (message: string, metadata?: Record<string, unknown>) => void
  log: (message: string, metadata?: Record<string, unknown>) => void
  info: (message: string, metadata?: Record<string, unknown>) => void
  warn: (message: string, metadata?: Record<string, unknown>) => void
  error: (message: string, metadata?: Record<string, unknown>) => void
}
