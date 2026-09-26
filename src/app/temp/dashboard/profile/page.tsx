import { redirect } from "next/navigation";
import { requireStudentPage } from "@/lib/supabase/page-auth";

// Compatibility only: the legacy profile UI now lives in the gamified shell.
export default async function ProfilePage() {
  await requireStudentPage();
  redirect("/temp/dashboard?view=profile");
}
