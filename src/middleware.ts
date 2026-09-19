import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type AppRole = "admin" | "student";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );

          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Keep this directly after createServerClient
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    return supabaseResponse;
  }

  const { pathname } = request.nextUrl;

  const isAdminArea = pathname.startsWith("/dashboard");
  const isStudentArea = pathname.startsWith("/temp/dashboard");
  const isAdminLogin = pathname.startsWith("/login");
  const isStudentLogin = pathname.startsWith("/temp/login");
  const isStudentSignup = pathname.startsWith("/temp/signup");

  // Unauthenticated behavior (unchanged where required)
  if (!user) {
    if (isAdminArea) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (isStudentArea) {
      return NextResponse.redirect(new URL("/temp/login", request.url));
    }

    return supabaseResponse;
  }

  // Fetch role only when needed for routing decisions
  const needsRoleDecision =
    isAdminArea ||
    isStudentArea ||
    isAdminLogin ||
    isStudentLogin ||
    isStudentSignup;

  let role: AppRole | null = null;

  if (needsRoleDecision) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      // Fail closed on protected areas, fail open on auth pages
      if (isAdminArea) {
        return NextResponse.redirect(new URL("/login", request.url));
      }
      if (isStudentArea) {
        return NextResponse.redirect(new URL("/temp/login", request.url));
      }
      return supabaseResponse;
    }

    role = profile.role as AppRole;
  }

  if (role === "admin") {
    // Admin should stay in admin area
    if (isStudentArea || isStudentLogin || isStudentSignup) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    if (isAdminLogin) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return supabaseResponse;
  }

  if (role === "student") {
    // Student should stay in temp area
    if (isAdminArea || isAdminLogin) {
      return NextResponse.redirect(new URL("/temp/dashboard", request.url));
    }
    if (isStudentLogin || isStudentSignup) {
      return NextResponse.redirect(new URL("/temp/dashboard", request.url));
    }
    return supabaseResponse;
  }

  // Unknown role fallback
  if (isAdminArea) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (isStudentArea) {
    return NextResponse.redirect(new URL("/temp/login", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
