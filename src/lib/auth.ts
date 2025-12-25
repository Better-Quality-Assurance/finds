import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Credentials from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { prisma } from '@/lib/db'
import type { Role } from '@prisma/client'
import type { Adapter } from 'next-auth/adapters'

declare module 'next-auth' {
  interface User {
    role: Role
    biddingEnabled: boolean
    emailVerified: Date | null
  }
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      role: Role
      biddingEnabled: boolean
      emailVerified: Date | null
    }
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma) as Adapter,
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
    verifyRequest: '/verify-email',
    error: '/login',
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user || !user.passwordHash) {
          return null
        }

        const isValid = await compare(
          credentials.password as string,
          user.passwordHash
        )

        if (!isValid) {
          return null
        }

        // Note: We allow login even if email is not verified
        // The application can check emailVerified in the session and restrict actions
        // This allows users to resend verification emails if needed
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          biddingEnabled: user.biddingEnabled,
          emailVerified: user.emailVerified,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.biddingEnabled = user.biddingEnabled
        token.emailVerified = user.emailVerified
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as Role
        session.user.biddingEnabled = token.biddingEnabled as boolean
        session.user.emailVerified = token.emailVerified as Date | null
      }
      return session
    },
  },
})
