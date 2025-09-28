"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";

interface Student {
  uid: string;
  email: string | null;
  creationTime: string | null;
  lastSignInTime: string | null;
}

const StudentsPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getIdToken, user } = useAuth();

  useEffect(() => {
    const fetchStudents = async () => {
      if (!user) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        // Get the current user's ID token
        const idToken = await getIdToken();
        if (!idToken) {
          throw new Error("Failed to get authentication token");
        }

        const res = await fetch("/api/admin/list-students", {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${idToken}`,
          },
        });
        if (!res.ok) throw new Error("Failed to fetch students");
        const data = await res.json();
        setStudents(data.students || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, [getIdToken, user]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Registered Students</h1>
      {loading && <div>Loading students...</div>}
      {error && <div className="text-red-500">{error}</div>}
      {!loading && !error && (
        <table className="min-w-full border border-black">
          <thead>
            <tr className="">
              <th className="py-2 px-4 border-b">Email</th>
              <th className="py-2 px-4 border-b">Sign-up Date</th>
              <th className="py-2 px-4 border-b">Last Login Date</th>
              <th className="py-2 px-4 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.uid} className="">
                <td className="py-2 px-4 border-b">{student.email}</td>
                <td className="py-2 px-4 border-b">
                  {student.creationTime
                    ? new Date(student.creationTime).toLocaleString()
                    : "-"}
                </td>
                <td className="py-2 px-4 border-b">
                  {student.lastSignInTime
                    ? new Date(student.lastSignInTime).toLocaleString()
                    : "-"}
                </td>
                <td className="py-2 px-4 border-b">
                  <Link
                    href={`/dashboard/students/${student.uid}`}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded text-sm"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default StudentsPage;
