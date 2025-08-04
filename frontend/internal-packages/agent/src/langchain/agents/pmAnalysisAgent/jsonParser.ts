import { err, ok, type Result, ResultAsync } from 'neverthrow'
import * as v from 'valibot'

/**
 * Schema for requirements analysis response
 */
const requirementsAnalysisSchema = v.strictObject({
  businessRequirement: v.string(),
  functionalRequirements: v.record(v.string(), v.array(v.string())),
  nonFunctionalRequirements: v.record(v.string(), v.array(v.string())),
})

export type AnalysisResponse = v.InferOutput<typeof requirementsAnalysisSchema>

/**
 * JSON Parser state for balanced brace extraction
 */
type JsonParserState = {
  braceCount: number
  inString: boolean
  escaped: boolean
}

/**
 * JSON Parser class for extracting and validating analysis responses
 */
export class JsonParser {
  /**
   * Process a character during JSON extraction
   */
  private processJsonChar(char: string, state: JsonParserState): boolean {
    if (state.escaped) {
      state.escaped = false
      return false
    }

    if (char === '\\' && state.inString) {
      state.escaped = true
      return false
    }

    if (char === '"' && !state.escaped) {
      state.inString = !state.inString
      return false
    }

    if (!state.inString) {
      if (char === '{') {
        state.braceCount++
      } else if (char === '}') {
        state.braceCount--
        return state.braceCount === 0 // Return true when complete JSON found
      }
    }

    return false
  }

  /**
   * Extract complete JSON object with balanced braces
   */
  private extractBalancedJson(content: string): string | null {
    const startIndex = content.indexOf('{')
    if (startIndex === -1) return null

    const state: JsonParserState = {
      braceCount: 0,
      inString: false,
      escaped: false,
    }

    for (let i = startIndex; i < content.length; i++) {
      const char = content[i]
      if (!char) continue
      const isComplete = this.processJsonChar(char, state)

      if (isComplete) {
        return content.substring(startIndex, i + 1)
      }
    }

    return null // Unbalanced braces
  }

  /**
   * Type guard to check if value is a record
   */
  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
  }

  /**
   * Extract JSON structure from various wrapping patterns
   */
  private extractDataFromWrapper(value: unknown): unknown {
    if (!this.isRecord(value)) {
      return value
    }

    // Case 1: { value: { actualData } }
    if ('value' in value && typeof value['value'] === 'object') {
      return value['value']
    }
    // Case 2: { response: { actualData } }
    if ('response' in value && typeof value['response'] === 'object') {
      return value['response']
    }
    // Case 3: { analysis: { actualData } }
    if ('analysis' in value && typeof value['analysis'] === 'object') {
      return value['analysis']
    }

    return value
  }

  /**
   * Parse response content and extract JSON analysis response
   */
  async parseResponse(
    content: string,
  ): Promise<Result<AnalysisResponse, Error>> {
    // Try to extract JSON from the response
    let jsonStr: string | null = null

    // Strategy 1: Extract from ```json code blocks
    const codeBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/)
    if (codeBlockMatch?.[1]?.trim()) {
      jsonStr = codeBlockMatch[1].trim()
    }

    // Strategy 2: Extract from ``` code blocks (without json specifier)
    if (!jsonStr) {
      const genericCodeBlockMatch = content.match(/```\s*([\s\S]*?)\s*```/)
      if (genericCodeBlockMatch?.[1]?.trim()) {
        const candidate = genericCodeBlockMatch[1].trim()
        // Check if it looks like JSON
        if (candidate.startsWith('{') && candidate.endsWith('}')) {
          jsonStr = candidate
        }
      }
    }

    // Strategy 3: Extract balanced JSON from entire content
    if (!jsonStr) {
      jsonStr = this.extractBalancedJson(content)
    }

    if (!jsonStr) {
      return err(new Error('No JSON found in response'))
    }

    // Parse JSON
    const parseResult = ResultAsync.fromPromise(
      Promise.resolve(JSON.parse(jsonStr)),
      (parseError) =>
        parseError instanceof Error
          ? parseError
          : new Error(String(parseError)),
    )

    const parsed = await parseResult.match(
      (result) => ok(result),
      (error) => {
        return err(new Error(`JSON parsing failed: ${error.message}`))
      },
    )

    if (parsed.isErr()) {
      return parsed
    }

    // Extract data from potential wrapper structures
    const dataToValidate = this.extractDataFromWrapper(parsed.value)

    // Validate the analysis structure
    const analysisResult = v.safeParse(
      requirementsAnalysisSchema,
      dataToValidate,
    )

    if (!analysisResult.success) {
      return err(
        new Error(
          `Validation failed: ${JSON.stringify(analysisResult.issues)}`,
        ),
      )
    }

    return ok(analysisResult.output)
  }
}
