import type { NextAuthOptions } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/db'

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = (credentials?.email || '').toString().trim().toLowerCase()
        const password = (credentials?.password || '').toString()
        if (!email || !password) return null

        // Simple env-based password check (replace with proper hashing later)
        const adminPass = process.env.ADMIN_PASSWORD || ''
        const ok = adminPass && password === adminPass
        if (!ok) return null

        // Ensure user exists in Prisma
        let user = await prisma.user.findUnique({ where: { email } })
        if (!user) {
          user = await prisma.user.create({ data: { email, name: email.split('@')[0] } })
        }
        return { id: user.id, email: user.email, name: user.name || undefined }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = token.id
      }
      return session
    },
  },
}

