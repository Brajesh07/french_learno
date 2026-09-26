'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

const StudentPortalContext = createContext<HTMLDivElement | null>(null);
export const useStudentPortal = () => useContext(StudentPortalContext);

/** Portals inherit only the student palette; no theme variables touch body/root. */
export function StudentSurface({ children }: { children: ReactNode }) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  return (
    <StudentPortalContext.Provider value={container}>
      <div className="lla-student" ref={setContainer}>{children}</div>
    </StudentPortalContext.Provider>
  );
}
