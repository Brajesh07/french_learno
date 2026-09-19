import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type RequireStudentPageOptions = {
  includeSubscription?: boolean;
  includeName?: boolean;
};

type RequireStudentPageResult = {
  user: { id: string };
  profile: {
    role: "student" | "admin";
    has_subscription?: boolean;
    name?: string | null;
  };
};

export async function requireStudentPage(
  options?: RequireStudentPageOptions,
): Promise<RequireStudentPageResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/temp/login");
  }

  const selectFields = ["role"];
  if (options?.includeSubscription) selectFields.push("has_subscription");
  if (options?.includeName) selectFields.push("name");

  const { data: profile } = await supabase
    .from("profiles")
    .select(selectFields.join(", "))
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "student") {
    redirect("/dashboard");
  }

  return {
    user: { id: user.id },
    profile: {
      role: profile.role,
      ...(options?.includeSubscription
        ? { has_subscription: profile.has_subscription }
        : {}),
      ...(options?.includeName ? { name: profile.name } : {}),
    },
  };
}