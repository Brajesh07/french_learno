"use client";
import { Home, Map, Gamepad2, Trophy, User } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
} from "@/components/ui/learning/sidebar";

export const studentNav = [
  { name: "Home", icon: Home },
  { name: "Learn", icon: Map },
  { name: "Play", icon: Gamepad2 },
  { name: "Leaderboard", icon: Trophy },
  { name: "Profile", icon: User },
] as const;
export type StudentView = (typeof studentNav)[number]["name"];
export function StudentSidebar({
  active,
  onNavigate,
}: {
  active: StudentView;
  onNavigate: (view: StudentView) => void;
}) {
  return (
    <Sidebar className="app-sidebar">
      <SidebarHeader>
        <button
          className="brand"
          onClick={() => onNavigate("Home")}
          aria-label="Learning home"
        >
          <span className="brand-mark">
            ll<span>a</span>
          </span>
          <span className="brand-caption">a little, every day.</span>
        </button>
      </SidebarHeader>
      <SidebarContent>
        <span className="nav-caption" id="student-nav-heading">
          YOUR LEARNING SPACE
        </span>
        <nav aria-labelledby="student-nav-heading">
          {studentNav.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={`nav-item ${active === name ? "active" : ""}`}
              aria-current={active === name ? "page" : undefined}
              onClick={() => onNavigate(name)}
            >
              <Icon size={21} />
              {name}
            </button>
          ))}
        </nav>
      </SidebarContent>
    </Sidebar>
  );
}
