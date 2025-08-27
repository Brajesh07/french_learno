"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import Link from "next/link";

interface StudentDetails {
  uid: string;
  email: string | null;
  creationTime: string | null;
  lastSignInTime: string | null;
  isActive: boolean;
  hasSubscription: boolean;
}

interface StudentPageProps {
  params: { uid: string };
}

const StudentPage: React.FC<StudentPageProps> = ({ params }) => {
  const [student, setStudent] = useState<StudentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const { getIdToken, user } = useAuth();

  const fetchStudent = useCallback(async () => {
    if (!user) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const idToken = await getIdToken();
      if (!idToken) {
        throw new Error("Failed to get authentication token");
      }

      const res = await fetch(`/api/admin/student/${params.uid}`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${idToken}`,
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
  }, [user, getIdToken, params.uid]);

  const updateStudent = async (updates: {
    isActive?: boolean;
    hasSubscription?: boolean;
  }) => {
    if (!user || !student) return;

    const updateType = "isActive" in updates ? "status" : "subscription";
    setUpdating(updateType);
    setError(null);

    try {
      const idToken = await getIdToken();
      if (!idToken) {
        throw new Error("Failed to get authentication token");
      }

      const res = await fetch(`/api/admin/student/${params.uid}`, {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
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
      <div className="p-6">
        <div>Loading student details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-500 mb-4">{error}</div>
        <Link
          href="/dashboard/students"
          className="text-blue-500 hover:underline"
        >
          ← Back to Students
        </Link>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-6">
        <div className="text-red-500 mb-4">Student not found</div>
        <Link
          href="/dashboard/students"
          className="text-blue-500 hover:underline"
        >
          ← Back to Students
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-4">
        <Link
          href="/dashboard/students"
          className="text-blue-500 hover:underline"
        >
          ← Back to Students
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">Student Details</h1>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <div className="mt-1 text-sm text-gray-900">
              {student.email || "N/A"}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              User ID
            </label>
            <div className="mt-1 text-sm text-gray-900 font-mono">
              {student.uid}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Sign-up Date
            </label>
            <div className="mt-1 text-sm text-gray-900">
              {student.creationTime
                ? new Date(student.creationTime).toLocaleString()
                : "N/A"}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Last Login
            </label>
            <div className="mt-1 text-sm text-gray-900">
              {student.lastSignInTime
                ? new Date(student.lastSignInTime).toLocaleString()
                : "Never"}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Account Management</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Account Status
            </label>
            <div className="flex items-center space-x-2">
              <span
                className={`px-2 py-1 rounded text-sm ${
                  student.isActive
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {student.isActive ? "Active" : "Inactive"}
              </span>
              <button
                onClick={() => updateStudent({ isActive: !student.isActive })}
                disabled={updating === "status"}
                className={`px-4 py-2 rounded text-sm font-medium ${
                  student.isActive
                    ? "bg-red-500 hover:bg-red-700 text-white"
                    : "bg-green-500 hover:bg-green-700 text-white"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {updating === "status"
                  ? "Updating..."
                  : student.isActive
                  ? "Deactivate"
                  : "Activate"}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subscription Status
            </label>
            <div className="flex items-center space-x-2">
              <span
                className={`px-2 py-1 rounded text-sm ${
                  student.hasSubscription
                    ? "bg-blue-100 text-blue-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {student.hasSubscription ? "Subscribed" : "Free"}
              </span>
              <button
                onClick={() =>
                  updateStudent({ hasSubscription: !student.hasSubscription })
                }
                disabled={updating === "subscription"}
                className={`px-4 py-2 rounded text-sm font-medium ${
                  student.hasSubscription
                    ? "bg-gray-500 hover:bg-gray-700 text-white"
                    : "bg-blue-500 hover:bg-blue-700 text-white"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {updating === "subscription"
                  ? "Updating..."
                  : student.hasSubscription
                  ? "Remove Subscription"
                  : "Add Subscription"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentPage;
