import type { ComponentPropsWithoutRef, FC } from 'react'

type Props = ComponentPropsWithoutRef<'svg'>

export const GlobeIcon: FC<Props> = (props) => {
  return (
    <svg
      aria-hidden="true"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      {...props}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M12 2C12 2 16 6 16 12C16 18 12 22 12 22C12 22 8 18 8 12C8 6 12 2 12 2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <path d="M2 12H22" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4.93 17H19.07" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4.93 7H19.07" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}
