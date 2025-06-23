export interface CookieOptions {
  path?: string
  maxAge?: number
  domain?: string
  secure?: boolean
  httpOnly?: boolean
  sameSite?: 'strict' | 'lax' | 'none'
}

/**
 * Get a cookie value by name
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null
  }

  const cookies = document.cookie.split('; ')
  const cookie = cookies.find((cookie) => cookie.startsWith(`${name}=`))
  return cookie ? (cookie.split('=')[1] ?? null) : null
}

/**
 * Get a cookie value and parse it as JSON
 */
export function getCookieJson<T>(name: string): T | null {
  const value = getCookie(name)
  if (!value) {
    return null
  }

  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

/**
 * Set a cookie value
 */
export function setCookie(
  name: string,
  value: string,
  options: CookieOptions = {},
): void {
  if (typeof document === 'undefined') {
    return
  }

  let cookieString = `${name}=${value}`

  if (options.path) {
    cookieString += `; path=${options.path}`
  }

  if (options.maxAge !== undefined) {
    cookieString += `; max-age=${options.maxAge}`
  }

  if (options.domain) {
    cookieString += `; domain=${options.domain}`
  }

  if (options.secure) {
    cookieString += '; secure'
  }

  if (options.httpOnly) {
    cookieString += '; httponly'
  }

  if (options.sameSite) {
    cookieString += `; samesite=${options.sameSite}`
  }

  // biome-ignore lint/suspicious/noDocumentCookie: This is the cookie utility abstraction layer
  document.cookie = cookieString
}

/**
 * Set a cookie value with JSON serialization
 */
export function setCookieJson(
  name: string,
  value: unknown,
  options: CookieOptions = {},
): void {
  setCookie(name, JSON.stringify(value), options)
}
