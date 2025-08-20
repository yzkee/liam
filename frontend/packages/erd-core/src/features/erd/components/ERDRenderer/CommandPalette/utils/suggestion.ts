import type { CommandPaletteSuggestion } from '../types'

export const getSuggestionText = (suggestion: CommandPaletteSuggestion) =>
  `${suggestion.type}|${suggestion.name}`

export const textToSuggestion = (
  text: string,
): CommandPaletteSuggestion | null => {
  const words = text.split('|')

  const [suggestionType, name] = words
  if (!suggestionType || !name) return null

  if (suggestionType === 'table' || suggestionType === 'command')
    return { type: suggestionType, name }

  return null
}
