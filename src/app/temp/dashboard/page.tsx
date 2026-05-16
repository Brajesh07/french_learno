import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";

export default async function TempDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/temp/login");
  }

  // Fetch profile
  const { data: existingProfile, error: fetchError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  let profile = existingProfile;

  // If no profile yet, create it via admin client
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

    profile = newProfile;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Temp Dashboard
          </h1>
          <form action="/api/auth/logout" method="POST">
            <Button variant="outline" type="submit">
              Logout
            </Button>
          </form>
        </div>

        {fetchError && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            Profile fetch error: {fetchError.message}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
              User Profile
            </h2>
          </div>
          <div className="p-6">
            {!profile ? (
              <p className="text-gray-600 dark:text-gray-400">
                No profile found for this user.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Full Name
                  </p>
                  <p className="text-lg text-gray-900 dark:text-white">
                    {profile.name}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Email Address
                  </p>
                  <p className="text-lg text-gray-900 dark:text-white">
                    {profile.email}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Username
                  </p>
                  <p className="text-lg text-gray-900 dark:text-white">
                    @{profile.username}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Role
                  </p>
                  <p className="text-lg font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    {profile.role}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
