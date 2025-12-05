import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
                params: {
                    scope: 'openid email profile https://www.googleapis.com/auth/gmail.modify',
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        }),
    ],
    callbacks: {
        async signIn({ user, account }) {
            // Check if user email is in the whitelist
            const adminEmail = process.env.ADMIN_EMAIL;
            if (user.email !== adminEmail) {
                return false; // Deny access
            }
            return true;
        },
        async session({ session, token }) {
            // Add user ID to session
            if (token && session.user) {
                session.user.id = token.sub as string;
            }
            return session;
        },
    },
    pages: {
        signIn: '/login',
        error: '/login',
    },
})
