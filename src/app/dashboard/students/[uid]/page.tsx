"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

interface StudentDetails {
  uid: string;
  email: string | null;
  creationTime: string | null;
  lastSignInTime: string | null;
  isActive: boolean;
  hasSubscription: boolean;
}

interface StudentPageProps {
  params: Promise<{ uid: string }>;
}

const StudentPage: React.FC<StudentPageProps> = ({ params }) => {
  const resolvedParams = React.use(params);
  const [student, setStudent] = useState<StudentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchStudent = useCallback(async () => {
    if (!user) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/student/${resolvedParams.uid}`, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch student");
      }

      const data = await res.json();
      setStudent(data.student);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [user, resolvedParams.uid]);

  const updateStudent = async (updates: {
    isActive?: boolean;
    hasSubscription?: boolean;
  }) => {
    if (!user || !student) return;

    const updateType = "isActive" in updates ? "status" : "subscription";
    setUpdating(updateType);
    setError(null);

    try {
      const res = await fetch(`/api/admin/student/${resolvedParams.uid}`, {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update student");
      }

      const data = await res.json();
      setStudent(data.student);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setUpdating(null);
    }
  };

  useEffect(() => {
    fetchStudent();
  }, [fetchStudent]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-lg mb-6">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
        <Link href="/dashboard/students">
          <Button variant="outline">← Back to Students</Button>
        </Link>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Student not found
        </h2>
        <Link href="/dashboard/students">
          <Button variant="outline">← Back to Students</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Breadcrumbs & Navigation */}
      <div className="flex items-center justify-between mb-8">
        <nav className="flex text-sm text-gray-500 dark:text-gray-400">
          <Link href="/dashboard/students" className="hover:text-blue-600 transition-colors">
            Students
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900 dark:text-white font-medium">Details</span>
        </nav>
        <Link href="/dashboard/students">
          <Button variant="outline" size="sm">
            ← Back
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Student Profile
              </h2>
            </div>
            <div className="p-6">
              <div className="flex items-center space-x-4 mb-8">
                <div className="h-16 w-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-2xl font-bold">
                  {student.email ? student.email.charAt(0).toUpperCase() : "S"}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {student.email || "No Email"}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                    ID: {student.uid}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4">
                <DetailItem
                  label="Email Address"
                  value={student.email || "N/A"}
                />
                <DetailItem
                  label="Sign-up Date"
                  value={
                    student.creationTime
                      ? new Date(student.creationTime).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "N/A"
                  }
                />
                <DetailItem
                  label="Last Login"
                  value={
                    student.lastSignInTime
                      ? new Date(student.lastSignInTime).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Never"
                  }
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Sidebar */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
              Account Status
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">Status</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    student.isActive
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                  }`}
                >
                  {student.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <Button
                variant={student.isActive ? "danger" : "primary"}
                className="w-full"
                size="sm"
                onClick={() => updateStudent({ isActive: !student.isActive })}
                disabled={updating === "status"}
              >
                {updating === "status"
                  ? "Updating..."
                  : student.isActive
                  ? "Deactivate Account"
                  : "Activate Account"}
              </Button>
            </div>

            <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                Subscription
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Plan</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      student.hasSubscription
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {student.hasSubscription ? "Premium" : "Free"}
                  </span>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  size="sm"
                  onClick={() =>
                    updateStudent({ hasSubscription: !student.hasSubscription })
                  }
                  disabled={updating === "subscription"}
                >
                  {updating === "subscription"
                    ? "Updating..."
                    : student.hasSubscription
                    ? "Remove Premium"
                    : "Grant Premium"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DetailItem: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <div>
    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
      {label}
    </p>
    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white truncate">
      {value}
    </p>
  </div>
);

export default StudentPage;
