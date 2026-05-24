import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import BackgroundBlurs from '@/components/shared/BackgroundBlurs'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Lock In',
  description: 'Your personal goal-tracking dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full`} style={{ position: 'relative' }}>
        <BackgroundBlurs />
        <div style={{ position: 'relative', zIndex: 1, height: '100%' }}>
          {children}
        </div>
      </body>
    </html>
  )
}
