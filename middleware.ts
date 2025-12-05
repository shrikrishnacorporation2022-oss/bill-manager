import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
    const isLoggedIn = !!req.auth
    const isOnLoginPage = req.nextUrl.pathname.startsWith('/login')
    const isAuthApi = req.nextUrl.pathname.startsWith('/api/auth')

    // Allow auth API routes
    if (isAuthApi) {
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
