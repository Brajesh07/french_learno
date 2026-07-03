import { BottomNav } from "./BottomNav";

export default function StudentDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100svh] bg-[#F5F5F7] relative pb-16">
      <main className="pb-8">{children}</main>
      <BottomNav />
    </div>
  );
}
