// NodeLogger is defined for use with Trigger.dev logging.
export type NodeLogger = (info: { node: string; state: string }) => void
