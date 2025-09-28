export type CommandPaletteInputMode =
  | { type: 'default' }
  | { type: 'command' }
  | { type: 'column'; tableName: string }

export type CommandPaletteSuggestion =
  | { type: 'table'; name: string }
  | { type: 'command'; name: string }
