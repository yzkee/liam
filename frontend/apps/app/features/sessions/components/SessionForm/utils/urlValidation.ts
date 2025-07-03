import type { FormatType } from '../../../../../components/FormatIcon/FormatIcon'

// Parse allowed domains from environment variable
const parseAllowedDomains = (): string[] => {
  const envDomains = process.env.NEXT_PUBLIC_ALLOWED_DOMAINS || ''
  if (!envDomains) {
    // Default allowed domains if env var is not set
    return ['raw.githubusercontent.com', 'github.com', 'gitlab.com']
  }
  return envDomains
    .split(',')
    .map((domain) => domain.trim())
    .filter(Boolean)
}

export const isValidSchemaUrl = (url: string): boolean => {
  // Check if it's a valid URL
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    return false
  }

  // Check domain whitelist
  const allowedDomains = parseAllowedDomains()
  const isAllowedDomain = allowedDomains.some(
    (domain) =>
      parsedUrl.hostname === domain ||
      parsedUrl.hostname.endsWith(`.${domain}`),
  )

  if (!isAllowedDomain) {
    return false
  }

  // Sanitize pathname to prevent path traversal
  const pathname = parsedUrl.pathname
  if (pathname.includes('..') || pathname.includes('//')) {
    return false
  }

  // Check for valid schema file extensions (check pathname, not full URL to prevent querystring bypass)
  const validExtensions = ['.sql', '.rb', '.prisma', '.json']
  const hasValidExtension = validExtensions.some((ext) =>
    pathname.toLowerCase().endsWith(ext),
  )

  // Additional security: check for suspicious patterns
  const suspiciousPatterns = [
    /[<>'"]/, // HTML/Script injection characters
    /\0/, // Null bytes
    /%00/, // URL-encoded null bytes
  ]

  if (suspiciousPatterns.some((pattern) => pattern.test(url))) {
    return false
  }

  return hasValidExtension
}

export const getFormatFromUrl = (url: string): FormatType => {
  // Parse URL to extract pathname without query params and fragments
  let pathname: string
  try {
    const urlObj = new URL(url)
    pathname = urlObj.pathname
  } catch {
    // Fallback for invalid URLs
    pathname = url.split('?')[0].split('#')[0]
  }

  // Extract extension from pathname
  const extension = pathname.split('.').pop()?.toLowerCase()

  switch (extension) {
    case 'sql':
      return 'postgres'
    case 'rb':
      return 'schemarb'
    case 'prisma':
      return 'prisma'
    case 'json':
      return 'tbls'
    default:
      return 'postgres' // Default format
  }
}

export const getFileNameFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    const fileName = pathname.split('/').pop() || 'schema'
    return fileName
  } catch {
    return 'schema'
  }
}

// Enhanced function for fetching schema from URL with security improvements
export const fetchSchemaFromUrl = async (
  url: string,
): Promise<{
  success: boolean
  content?: string
  error?: string
}> => {
  // Step 1: Validate URL format and protocol
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    return {
      success: false,
      error: 'Invalid URL format. Please provide a valid URL.',
    }
  }

  // Step 2: Validate protocol
  const hostname = parsedUrl.hostname.toLowerCase()
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1'

  // Allow HTTP only for localhost in development
  const allowedProtocols = ['https:']
  if (process.env.NODE_ENV === 'development' && isLocalhost) {
    allowedProtocols.push('http:')
  }

  if (!allowedProtocols.includes(parsedUrl.protocol)) {
    const protocolError =
      process.env.NODE_ENV === 'development' && parsedUrl.protocol === 'http:'
        ? `HTTP is only allowed for localhost in development. Use HTTPS for ${hostname}.`
        : `Unsupported protocol: ${parsedUrl.protocol}. Only HTTPS is allowed.`

    return {
      success: false,
      error: protocolError,
    }
  }

  // Step 3: Validate domain whitelist
  const allowedDomains = parseAllowedDomains()

  // In development, apply special validation for localhost
  if (process.env.NODE_ENV === 'development') {
    if (isLocalhost) {
      // Additional checks for localhost URLs
      // 1. Ensure the port is within expected range (e.g., common dev server ports)
      const port = parsedUrl.port || '80'
      const allowedPorts = [
        '3000',
        '3001',
        '4000',
        '5000',
        '8000',
        '8080',
        '8081',
      ]

      if (!allowedPorts.includes(port) && port !== '80') {
        return {
          success: false,
          error: `Localhost port ${port} is not allowed. Use common development ports.`,
        }
      }

      // 2. Additional path validation for localhost
      const suspiciousLocalPaths = [
        '/admin',
        '/api',
        '/config',
        '/.env',
        '/secret',
      ]
      if (
        suspiciousLocalPaths.some((path) =>
          parsedUrl.pathname.toLowerCase().startsWith(path),
        )
      ) {
        return {
          success: false,
          error: 'Access to sensitive localhost paths is not allowed.',
        }
      }
    }
  }

  // Check if domain is in the allowed list (applies to all environments)
  const isDomainAllowed = allowedDomains.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
  )

  // In development, also allow localhost with the additional checks above
  const isLocalhostAllowed =
    process.env.NODE_ENV === 'development' &&
    (hostname === 'localhost' || hostname === '127.0.0.1')

  if (!isDomainAllowed && !isLocalhostAllowed) {
    return {
      success: false,
      error: `Domain not allowed: ${hostname}. Please use a trusted source.`,
    }
  }

  // Step 4: Validate file extension
  if (!isValidSchemaUrl(url)) {
    return {
      success: false,
      error: 'Invalid file type. Supported formats: .sql, .rb, .prisma, .json',
    }
  }

  // Step 5: Sanitize URL by removing unnecessary parts
  const sanitizedUrl = `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname}`

  try {
    // In production, make a secure API call to fetch the schema
    const response = await fetch(sanitizedUrl, {
      method: 'GET',
      headers: {
        Accept: 'text/plain',
      },
      // Add security headers and timeout as needed
    })

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch schema: HTTP ${response.status}`,
      }
    }

    const content = await response.text()
    return {
      success: true,
      content,
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch schema: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}
