import { StudentDashboardFrame } from './StudentDashboardFrame';

export default function StudentDashboardLayout({ children }: { children: React.ReactNode }) {
  return <StudentDashboardFrame>{children}</StudentDashboardFrame>;
}
