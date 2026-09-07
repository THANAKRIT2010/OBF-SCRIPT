import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Paths that must stay public (auth endpoints, the login page itself,
// and static/SEO files that crawlers and the browser need without a session).
const PUBLIC_PATHS = [
	"/login",
	"/api/auth",
	"/favicon.ico",
	"/robots.txt",
	"/sitemap.xml",
	"/manifest.webmanifest",
];

function isPublicPath(pathname: string): boolean {
	if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + "/"))) return true;
	if (pathname.startsWith("/_next")) return true;
	// static assets (images, fonts, etc.)
	if (/\.(?:svg|png|jpg|jpeg|webp|ico|txt|xml|webmanifest)$/.test(pathname)) return true;
	return false;
}

export default auth(req => {
	const { pathname } = req.nextUrl;

	if (isPublicPath(pathname)) {
		return NextResponse.next();
	}

	if (!req.auth) {
		const loginUrl = new URL("/login", req.nextUrl.origin);
		loginUrl.searchParams.set("callbackUrl", pathname);
		return NextResponse.redirect(loginUrl);
	}

	if (pathname.startsWith("/admin") && !req.auth.user?.isAdmin) {
		return NextResponse.redirect(new URL("/", req.nextUrl.origin));
	}

	return NextResponse.next();
});

export const config = {
	matcher: ["/((?!_next/static|_next/image).*)"],
};
