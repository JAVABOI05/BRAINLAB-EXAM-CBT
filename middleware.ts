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
 * Adds a private-entry gate in front of the operator area.
 *
 * The private entry opens the shared account portal. A verified operator
 * session is separately required before the API issues the operator gate
 * cookie. Database RLS remains the final authorization boundary.
 */
export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const entryPath = process.env.BRAINLAB_PRIVATE_ENTRY_PATH ?? "";
  const entryToken = process.env.BRAINLAB_PRIVATE_ENTRY_TOKEN ?? "";
  const entryPathIsValid = /^[A-Za-z0-9_-]{32,128}$/.test(entryPath);
  const entryTokenIsValid = entryToken.length >= 32;
  const privateEntryConfigured = entryPathIsValid && entryTokenIsValid;

  // The configured path opens the shared account portal only. It does NOT
  // grant access to /admin; only the server-verified operator-gate endpoint
  // may issue the HttpOnly cookie used by the protected route matcher.
  if (privateEntryConfigured && pathname === `/${entryPath}`) {
    const destination = request.nextUrl.clone();
    destination.pathname = "/account";
    destination.search = "";
    const response = NextResponse.rewrite(destination);
    response.headers.set("X-Robots-Tag", NO_INDEX);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    // If private entry is configured, require the private entry cookie
    if (
      privateEntryConfigured &&
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
