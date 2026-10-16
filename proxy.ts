import { NextRequest, NextResponse } from "next/server";

const ENTRY_COOKIE = "brainlab_private_entry";
const NO_INDEX = "noindex, nofollow, noarchive";

function notFound() {
  return new NextResponse("Not Found", {
    status: 404,
    headers: {
      "Cache-Control": "no-store",
      "X-Robots-Tag": NO_INDEX,
    },
  });
}

/**
 * Adds a private-entry gate in front of the existing admin UI.
 *
 * This is intentionally only defense in depth. Supabase Auth, server-side
 * checks, and database RLS must still authorize every protected operation.
 * Both environment values are server-only and must never use NEXT_PUBLIC_.
 */
export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const entryPath = process.env.BRAINLAB_PRIVATE_ENTRY_PATH ?? "";
  const entryToken = process.env.BRAINLAB_PRIVATE_ENTRY_TOKEN ?? "";
  const entryPathIsValid = /^[A-Za-z0-9_-]{32,128}$/.test(entryPath);
  const entryTokenIsValid = entryToken.length >= 32;
  const privateEntryConfigured = entryPathIsValid && entryTokenIsValid;

  // The configured one-segment path is the only way to open the sign-in UI
  // in a fresh browser. It is never hard-coded into the public source.
  if (privateEntryConfigured && pathname === `/${entryPath}`) {
    const destination = request.nextUrl.clone();
    destination.pathname = "/admin/login";
    destination.search = "";
    const response = NextResponse.rewrite(destination);
    response.cookies.set(ENTRY_COOKIE, entryToken, {
      httpOnly: true,
      secure: request.nextUrl.protocol === "https:",
      sameSite: "lax",
      path: "/admin",
      maxAge: 60 * 60 * 8,
    });
    response.headers.set("X-Robots-Tag", NO_INDEX);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    // Fail closed if deployment has not been configured, or if the browser
    // did not first pass through the private entry path.
    if (
      !privateEntryConfigured ||
      request.cookies.get(ENTRY_COOKIE)?.value !== entryToken
    ) {
      return notFound();
    }

    const response = NextResponse.next();
    response.headers.set("X-Robots-Tag", NO_INDEX);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/:entry"],
};
