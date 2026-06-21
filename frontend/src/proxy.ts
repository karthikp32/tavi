import { NextRequest, NextResponse } from "next/server";

interface Session {
  id: string;
  type: "facility_manager" | "vendor";
  name: string;
  trade: string | null;
  company_id: string | null;
}

const COOKIE_NAME = "tavi_session";

function readSession(request: NextRequest): Session | null {
  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  if (!cookie) return null;
  try {
    return JSON.parse(decodeURIComponent(cookie)) as Session;
  } catch {
    return null;
  }
}

function homePathForSession(_session: Session): string {
  void _session;
  return "/tavi";
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = readSession(request);

  if (pathname === "/login") {
    if (session) {
      return NextResponse.redirect(new URL(homePathForSession(session), request.url));
    }
    return NextResponse.next();
  }

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname === "/" || pathname === "/home") {
    return NextResponse.redirect(new URL("/tavi", request.url));
  }

  if (
    session.type === "vendor" &&
    (pathname.startsWith("/work-orders") ||
      pathname.startsWith("/facilities") ||
      pathname.startsWith("/vendors"))
  ) {
    return NextResponse.redirect(new URL("/vendor/marketplace", request.url));
  }

  if (session.type === "facility_manager" && pathname.startsWith("/vendor/")) {
    return NextResponse.redirect(new URL("/work-orders", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
