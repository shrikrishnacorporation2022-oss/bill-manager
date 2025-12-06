import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
    const isLoggedIn = !!req.auth
    const isOnLoginPage = req.nextUrl.pathname.startsWith('/login')
    const isAuthApi = req.nextUrl.pathname.startsWith('/api/auth')
    const isTelegramApi = req.nextUrl.pathname.startsWith('/api/telegram')
    const isGmailWebhook = req.nextUrl.pathname.startsWith('/api/gmail/webhook')

    // Allow auth API routes, Telegram webhook, and Gmail webhook
    if (isAuthApi || isTelegramApi || isGmailWebhook) {
        return NextResponse.next()
    }

    // Redirect to dashboard if logged in and on login page
    if (isLoggedIn && isOnLoginPage) {
        return NextResponse.redirect(new URL('/', req.url))
    }

    // Redirect to login if not logged in and not on login page
    if (!isLoggedIn && !isOnLoginPage) {
        return NextResponse.redirect(new URL('/login', req.url))
    }

    return NextResponse.next()
})

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
