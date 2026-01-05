import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Credentials from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { prisma } from '@/lib/db'
import { ActivityType, type Role } from '@prisma/client'
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
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.biddingEnabled = user.biddingEnabled
        token.emailVerified = user.emailVerified
      }

      // Refresh emailVerified from database on each request to catch verification updates
      // This ensures users don't need to re-login after verifying their email
      if (token.id && (trigger === 'update' || !token.emailVerified)) {
        try {
          const freshUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { emailVerified: true, biddingEnabled: true, role: true },
          })
          if (freshUser) {
            token.emailVerified = freshUser.emailVerified
            token.biddingEnabled = freshUser.biddingEnabled
            token.role = freshUser.role
          }
        } catch {
          // If db lookup fails, keep existing token values
        }
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
  events: {
    async signIn({ user }) {
      if (user?.id) {
        // Track login activity
        await Promise.all([
          prisma.user.update({
            where: { id: user.id },
            data: {
              lastLoginAt: new Date(),
              lastSeenAt: new Date(),
              loginCount: { increment: 1 },
            },
          }),
          prisma.userActivity.create({
            data: {
              userId: user.id,
              activityType: ActivityType.LOGIN,
              description: 'User logged in',
            },
          }),
        ]).catch((error) => {
          console.error('Failed to track login:', error)
        })
      }
    },
    // Note: signOut event doesn't have access to token in JWT strategy
    // Logout tracking can be done client-side if needed
  },
})
