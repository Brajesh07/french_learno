"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
  // Use regular client only to verify the authenticated user
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const name = formData.get("name") as string;
  const phone = (formData.get("phone") as string) || null;
  const className = (formData.get("class") as string) || null;

  if (!name?.trim()) {
    return { error: "Name is required" };
  }

  // Use admin client to bypass RLS and perform the update
  const admin = await createAdminClient();

  const { error } = await admin
    .from("profiles")
    .update({
      name: name.trim(),
      phone,
      class: className,
    })
    .eq("id", user.id);

  if (error) {
    console.error("Profile update error:", error);
    return { error: error.message };
  }

  revalidatePath("/temp/dashboard");
  return { success: true };
}
