
import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "./db"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        })

        if (!user?.hashedPassword) {
          return null
        }

        // Check if user is active
        if (user.status !== 'ACTIVE') {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
          photoUrl: user.photoUrl,
          imdbProfile: user.imdbProfile,
          isProfileComplete: user.isProfileComplete,
          createdAt: user.createdAt.toISOString(),
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
    updateAge: 60 * 60, // 1 hour
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      // Force refresh token data on update trigger
      if (trigger === 'update') {
        // Fetch fresh user data from database
        if (token.sub) {
          const freshUser = await prisma.user.findUnique({
            where: { id: token.sub }
          })
          
          if (freshUser) {
            return {
              ...token,
              role: freshUser.role,
              phone: freshUser.phone,
              photoUrl: freshUser.photoUrl,
              imdbProfile: freshUser.imdbProfile,
              isProfileComplete: freshUser.isProfileComplete,
              createdAt: freshUser.createdAt.toISOString(),
            }
          }
        }
      }
      
      if (user) {
        return {
          ...token,
          role: user.role,
          phone: user.phone,
          photoUrl: user.photoUrl,
          imdbProfile: user.imdbProfile,
          isProfileComplete: user.isProfileComplete,
          createdAt: user.createdAt, // This will be the ISO string from authorize
        }
      }
      return token
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.sub,
          role: token.role,
          phone: token.phone,
          photoUrl: token.photoUrl,
          imdbProfile: token.imdbProfile,
          isProfileComplete: token.isProfileComplete,
          createdAt: token.createdAt, // This will be the ISO string from JWT
        }
      }
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
}
