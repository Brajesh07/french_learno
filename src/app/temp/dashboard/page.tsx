import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export default async function TempDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("[temp/dashboard] user:", user);

  if (!user) {
    redirect("/temp/login");
  }

  // Fetch profile (RLS: user can only read their own row)
  const { data: existingProfile, error: fetchError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  console.log(
    "[temp/dashboard] fetched profile:",
    existingProfile,
    "error:",
    fetchError,
  );

  let profile = existingProfile;

  // If no profile yet, create it via admin client (bypasses RLS — safe server-side only)
  if (!existingProfile && !fetchError) {
    const meta = user.user_metadata ?? {};
    const admin = await createAdminClient();

    const { data: newProfile, error: insertError } = await admin
      .from("profiles")
      .insert({
        id: user.id,
        name: meta.name ?? "Unknown",
        username: meta.username ?? user.email?.split("@")[0] ?? "user",
        email: user.email ?? "",
        role: "student",
      })
      .select()
      .maybeSingle();

    console.log(
      "[temp/dashboard] created profile:",
      newProfile,
      "insertError:",
      insertError,
    );
    profile = newProfile;
  }

  return (
    <div>
      <h1>Temp Dashboard</h1>
      {fetchError && <p>Profile fetch error: {fetchError.message}</p>}
      {!profile && <p>No profile found for this user.</p>}
      {profile && (
        <div>
          <p>
            <strong>Name:</strong> {profile.name}
          </p>
          <p>
            <strong>Email:</strong> {profile.email}
          </p>
          <p>
            <strong>Username:</strong> {profile.username}
          </p>
          <p>
            <strong>Role:</strong> {profile.role}
          </p>
        </div>
      )}
    </div>
  );
}
