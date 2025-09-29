/**
 * Dictionary (Concept) Matching
 *
 * Minimal Option B implementation: concept ID based matching using
 * a pre-registered dictionary of alias groups. If a reference and
 * a candidate resolve to the same concept, we map them with priority
 * over other strategies.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

type Mapping = Record<string, string>

type Concept = {
  id: string
  aliases: string[]
  scope?: string[]
}

type ConceptDictFile = {
  concepts: Concept[]
  generic_tokens?: string[]
}

export type ConceptIndex = {
  aliasToConcept: Map<string, string>
  conceptToAliases: Map<string, string[]>
  genericTokens: Set<string>
}

function normalizeAlias(s: string): string {
  // Basic canonicalization: lowercase, split CamelCase, replace non-alnum with underscore, trim underscores
  const camelSplit = s.replace(/([a-z0-9])([A-Z])/g, '$1_$2')
  const lowered = camelSplit.toLowerCase()
  const replaced = lowered.replace(/[^a-z0-9]+/g, '_')
  return replaced.replace(/^_+|_+$/g, '')
}

function toTokens(s: string): string[] {
  return normalizeAlias(s).split('_').filter(Boolean)
}

function jaccard(a: Set<string>, b: Set<string>): number {
  const inter = [...a].filter((x) => b.has(x)).length
  const uni = new Set([...a, ...b]).size
  return uni === 0 ? 0 : inter / uni
}

function readJson(filePath: string): ConceptDictFile | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    const parsed = JSON.parse(raw)
    return parsed
  } catch {
    return null
  }
}

/**
 * Load default dictionary shipped with this package.
 */
function loadDefaultConceptDict(): ConceptDictFile | null {
  // Resolve relative to this module file so tests/CLI can locate it reliably
  const __dirnameLocal = fileURLToPath(new URL('.', import.meta.url))
  const dictPath = path.resolve(
    __dirnameLocal,
    '../dictionaries/global.concepts.json',
  )
  return readJson(dictPath)
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: TODO: Refactor to reduce complexity
export function buildConceptIndex(dicts?: ConceptDictFile[]): ConceptIndex {
  const aliasToConcept = new Map<string, string>()
  const conceptToAliases = new Map<string, string[]>()
  const genericTokens = new Set<string>()

  const loaded: ConceptDictFile[] = []
  if (dicts && dicts.length > 0) {
    loaded.push(...dicts)
  } else {
    const def = loadDefaultConceptDict()
    if (def) {
      loaded.push(def)
    } else {
      // Warn so consumers notice dictionary-based matching is disabled
      console.warn(
        '[schema-bench] No concept dictionaries loaded; dictionaryMatch will be a no-op.',
      )
    }
  }

  for (const dict of loaded) {
    if (dict.generic_tokens) {
      for (const t of dict.generic_tokens) genericTokens.add(normalizeAlias(t))
    }
    for (const c of dict.concepts) {
      const normAliases = c.aliases.map((a) => normalizeAlias(a))
      conceptToAliases.set(c.id, normAliases)
      for (const a of normAliases) {
        const prev = aliasToConcept.get(a)
        if (prev && prev !== c.id) {
          // Keep the first mapping deterministically and warn for visibility
          console.warn(
            `[schema-bench] Duplicate alias "${a}" for concepts "${prev}" and "${c.id}". Keeping "${prev}".`,
          )
          continue
        }
        aliasToConcept.set(a, c.id)
      }
    }
  }

  return { aliasToConcept, conceptToAliases, genericTokens }
}

export type DictionaryMatchOptions = {
  // threshold for token-based concept inference (fallback when direct alias not found)
  tokenJaccardThreshold?: number // default 0.8
}

function inferConceptByTokens(
  name: string,
  index: ConceptIndex,
  opts?: DictionaryMatchOptions,
): string | null {
  const tokens = toTokens(name).filter((t) => !index.genericTokens.has(t))
  const tokenSet = new Set(tokens)
  let best: { id: string; score: number } | null = null
  for (const [id, aliases] of index.conceptToAliases) {
    for (const al of aliases) {
      const alTokens = toTokens(al).filter((t) => !index.genericTokens.has(t))
      const score = jaccard(tokenSet, new Set(alTokens))
      if (!best || score > best.score) best = { id, score }
    }
  }
  const threshold = opts?.tokenJaccardThreshold ?? 0.8
  return best && best.score >= threshold ? best.id : null
}

export function conceptOf(
  name: string,
  index: ConceptIndex,
  opts?: DictionaryMatchOptions,
): string | null {
  const normalized = normalizeAlias(name)
  const byAlias = index.aliasToConcept.get(normalized)
  if (byAlias) return byAlias
  return inferConceptByTokens(name, index, opts)
}

/**
 * dictionaryMatch: Assign mappings for pairs that share the same concept.
 */

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: TODO: Refactor to reduce complexity
export function dictionaryMatch(
  references: string[],
  candidates: string[],
  mapping: Mapping,
  options?: DictionaryMatchOptions,
  index?: ConceptIndex,
): void {
  const localIndex = index ?? buildConceptIndex()

  // Track used candidates to avoid duplicates
  const used = new Set(Object.values(mapping))

  // Precompute candidate concepts
  const candConcepts = new Map<string, string | null>()
  for (const c of candidates) {
    candConcepts.set(c, conceptOf(c, localIndex, options))
  }

  for (const ref of references) {
    if (mapping[ref] !== undefined) continue
    const refConcept = conceptOf(ref, localIndex, options)
    if (!refConcept) continue

    // Choose the first unused candidate with the same concept; if multiple, prefer higher token overlap
    let bestCand: { name: string; score: number } | null = null
    for (const cand of candidates) {
      if (used.has(cand)) continue
      const cConcept = candConcepts.get(cand)
      if (!cConcept || cConcept !== refConcept) continue
      // Score by token Jaccard (ignoring generic tokens)
      const s = jaccard(
        new Set(toTokens(ref).filter((t) => !localIndex.genericTokens.has(t))),
        new Set(toTokens(cand).filter((t) => !localIndex.genericTokens.has(t))),
      )
      if (!bestCand || s > bestCand.score) bestCand = { name: cand, score: s }
    }
    if (bestCand) {
      mapping[ref] = bestCand.name
      used.add(bestCand.name)
    }
  }
}
