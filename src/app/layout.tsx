import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '17solutions — SDG Innovation Engine',
  description: 'Von Berichten zu Relevanz. SDG-Innovation in Stunden statt Monaten.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  )
}
