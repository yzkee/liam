import type { Metadata } from 'next'
import type React from 'react'

export const metadata: Metadata = {
  title: 'Liam DB',
  description:
    'Build and manage your database schemas with Liam DB. Create, visualize, and collaborate on database designs.',
  openGraph: {
    siteName: 'Liam',
    type: 'website',
    locale: 'en_US',
    images: '/assets/liam_erd.png',
  },
  twitter: {},
}

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <>{children}</>
}
