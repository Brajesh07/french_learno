import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // service role bypasses RLS
);

async function seed() {
  // 1. Create auth user
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email: "contact@learnwithpoorvi.in",
      password: "LearnFrenchAdmin@07062001!#",
      email_confirm: true,
    });

  if (authError) {
    console.error("Auth error:", authError.message);
    return;
  }

  const userId = authData.user.id;
  console.log("Auth user created:", userId);

  // 2. Insert profile
  const { error: profileError } = await supabase.from("profiles").insert({
    id: userId,
    name: "Admin",
    username: "admin",
    email: "contact@learnwithpoorvi.in",
    role: "admin",
  });

  if (profileError) {
    console.error("Profile error:", profileError.message);
    return;
  }

  console.log("✅ Admin seeded successfully");
}

seed();
