/**
 * Utility functions for BYTEA column handling in Supabase
 *
 * Supabase REST API requires Base64 encoding for BYTEA columns when writing,
 * but always returns them as PostgreSQL hex format (e.g., '\x6465...').
 */

/**
 * Convert Uint8Array to Base64 string for Supabase BYTEA columns
 * Uses efficient methods based on environment (Node.js vs Browser)
 */
export const uint8ArrayToBase64 = (uint8Array: Uint8Array): string => {
  // For Node.js environments - more efficient for large data
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(uint8Array).toString('base64')
  }

  // For browser environments - more efficient than the old method
  const binaryString = Array.from(uint8Array)
    .map((byte) => String.fromCharCode(byte))
    .join('')
  return btoa(binaryString)
}

/**
 * Convert hex string from PostgreSQL BYTEA to Uint8Array
 * Handles format: '\x48656c6c6f' -> [72, 101, 108, 108, 111]
 */
export const hexToUint8Array = (hex: string): Uint8Array => {
  // Remove the '\x' prefix if present
  const cleanHex = hex.startsWith('\\x') ? hex.slice(2) : hex

  // Convert hex string to Uint8Array
  const bytes = new Uint8Array(cleanHex.length / 2)
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = Number.parseInt(cleanHex.substring(i, i + 2), 16)
  }
  return bytes
}

/**
 * Convert Base64 string to Uint8Array
 * Uses efficient methods based on environment
 */
export const base64ToUint8Array = (base64: string): Uint8Array => {
  // For Node.js environments - more efficient
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'))
  }

  // For browser environments
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

/**
 * Convert hex string from Supabase BYTEA to Uint8Array
 * Supabase always returns BYTEA columns in hex format (\x...)
 */
export const byteaToUint8Array = (data: string): Uint8Array => {
  // Supabase BYTEA is always in hex format
  return hexToUint8Array(data)
}

/**
 * Convert Uint8Array to string
 */
export const uint8ArrayToString = (uint8Array: Uint8Array): string => {
  return new TextDecoder().decode(uint8Array)
}
