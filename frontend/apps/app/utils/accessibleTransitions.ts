import type { CSSProperties } from 'react'

/**
 * Creates accessible transition styles that respect user's motion preferences
 * @param property - The CSS property to transition (e.g., 'opacity', 'transform')
 * @param duration - The transition duration in milliseconds
 * @param easing - The CSS easing function (default: 'ease-out')
 * @returns CSS properties object with the appropriate transition
 */
export const createAccessibleTransition = (
  property: string,
  duration: number,
  easing = 'ease-out',
): CSSProperties => {
  // Check if user prefers reduced motion
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (prefersReducedMotion) {
    // For reduced motion, we still want state changes to be visible
    // but without the animation effect
    return {
      transition: `${property} 0.01ms linear`,
    }
  }

  return {
    transition: `${property} ${duration}ms ${easing}`,
  }
}

/**
 * Creates accessible opacity transition styles
 * @param isVisible - Whether the element should be visible
 * @param duration - The transition duration in milliseconds (default: 150)
 * @returns CSS properties object with opacity and transition
 */
export const createAccessibleOpacityTransition = (
  isVisible: boolean,
  duration = 150,
): CSSProperties => {
  return {
    opacity: isVisible ? 1 : 0,
    ...createAccessibleTransition('opacity', duration),
  }
}

/**
 * Hook to check if user prefers reduced motion
 * @returns boolean indicating if reduced motion is preferred
 */
import { useEffect, useState } from 'react'

export const usePrefersReducedMotion = (): boolean => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return prefersReducedMotion
}

/**
 * Creates accessible height transition styles for dynamic content
 * @param duration - The transition duration in milliseconds (default: 300)
 * @returns CSS properties object with the appropriate transition
 */
export const createAccessibleHeightTransition = (
  duration = 300,
): CSSProperties => {
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (prefersReducedMotion) {
    // For height transitions, we skip the animation entirely when reduced motion is preferred
    return {}
  }

  return {
    transition: `height ${duration}ms ease-out`,
  }
}
