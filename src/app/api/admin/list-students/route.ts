import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/auth-helpers";
import { createAdminClient } from "@/lib/supabase/server";

// ----------------------------------------------------------------
// GET /api/admin/list-students
// Returns all users with role = 'student'.
// Uses admin (service role) client to bypass RLS.
// ----------------------------------------------------------------
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  try {
    // Use admin client — anon client is blocked by RLS for cross-user reads
    const supabase = await createAdminClient();
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search");
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("profiles")
      .select("id, name, username, email, phone, class, created_at", {
        count: "exact",
      })
      .eq("role", "student")
      .order("created_at", { ascending: false });

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,username.ilike.%${search}%,email.ilike.%${search}%`,
      );
    }

    const { data, error, count } = await query.range(from, to);

    console.log(
      "[list-students] rows returned:",
      data?.length ?? 0,
      "total count:",
      count,
    );
    console.log("[list-students] raw data:", data);
    console.log("[list-students] error:", error);

    if (error) {
      console.error("Error listing students:", error);
      return NextResponse.json(
        { error: "Failed to list students" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      students: data ?? [],
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    });
  } catch (error) {
    console.error("List students error:", error);
    return NextResponse.json(
      { error: "Failed to list students" },
      { status: 500 },
    );
  }
}
