import type { Metadata } from 'next'

export const metadata: Metadata = {
  robots: {
    index: true,
    follow: true,
  },
}

type Props = {
  children: React.ReactNode
}

export default function AuthLayout({ children }: Props) {
  return children
}
