"use client";
import { useEffect, useState } from "react";
type AssignmentData = {
  assignment: {
    id: string;
    teacherId: string;
    teacherName: string;
    status: string;
    active: boolean;
  } | null;
  teachers: { id: string; name: string; email: string }[];
};
export function StudentAssignment({ studentId }: { studentId: string }) {
  const [data, setData] = useState<AssignmentData | null>(null),
    [teacherId, setTeacherId] = useState("");
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [saving, setSaving] = useState(false),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError("");
    setNotice("");
    fetch(`/api/admin/student/${studentId}/assignment`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const value = await response.json();
        if (!response.ok)
          throw new Error(value.error || "Unable to load assignment.");
        return value as AssignmentData;
      })
      .then((value) => {
        if (!controller.signal.aborted) {
          setData(value);
          setTeacherId(value.assignment?.teacherId ?? "");
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error ? e.message : "Unable to load assignment.",
          );
      });
    return () => controller.abort();
  }, [studentId, attempt]);
  async function save(target: string | null) {
    if (!data || saving) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        `/api/admin/student/${studentId}/assignment`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teacherId: target,
            expectedAssignmentId: data.assignment?.id ?? null,
          }),
        },
      );
      const value = await response.json();
      if (!response.ok)
        throw new Error(value.error || "Assignment could not be saved.");
      setData(value);
      setTeacherId(value.assignment?.teacherId ?? "");
      setNotice(
        target
          ? "Teacher assignment saved."
          : "Student unassigned. Learning history is preserved.",
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Assignment could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <section
      className="grid gap-4 rounded-xl border border-gray-200 bg-white p-6 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
      aria-labelledby="assignment-title"
    >
      <h2 id="assignment-title" className="text-lg font-semibold">
        Teacher assignment
      </h2>
      {data ? (
        <>
          <p className="text-sm">
            Current teacher:{" "}
            <strong>{data.assignment?.teacherName ?? "Not assigned"}</strong>
            {data.assignment &&
              (!data.assignment.active ||
                data.assignment.status !== "approved") && (
                <span className="block mt-2 text-amber-700 dark:text-amber-300">
                  This teacher is not currently active and approved. Assign
                  another teacher to restore learning access.
                </span>
              )}
          </p>
          <label className="grid gap-2 text-sm">
            Approved teacher
            <select
              value={teacherId}
              disabled={saving}
              onChange={(e) => setTeacherId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white p-3 dark:border-gray-600 dark:bg-gray-900"
            >
              <option value="">Choose a teacher</option>
              {data.assignment &&
                !data.teachers.some(
                  (t) => t.id === data.assignment?.teacherId,
                ) && (
                  <option value={data.assignment.teacherId} disabled>
                    {data.assignment.teacherName} (unavailable)
                  </option>
                )}
              {data.teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · {t.email}
                </option>
              ))}
            </select>
          </label>
          {!data.teachers.length && (
            <p className="text-sm text-gray-500">
              Approve an active teacher before assigning students.
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => void save(teacherId)}
              disabled={
                saving ||
                !data.teachers.some((t) => t.id === teacherId) ||
                teacherId === data.assignment?.teacherId
              }
              className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-40"
            >
              {saving ? "Saving…" : "Assign teacher"}
            </button>
            <button
              onClick={() => void save(null)}
              disabled={saving || !data.assignment}
              className="rounded-lg border px-4 py-2 disabled:opacity-40"
            >
              Unassign
            </button>
          </div>
        </>
      ) : (
        !error && <p role="status">Loading teacher assignment…</p>
      )}
      {notice && (
        <p role="status" className="text-sm text-green-700 dark:text-green-300">
          {notice}
        </p>
      )}
      {error && (
        <div
          role="alert"
          className="grid gap-2 text-sm text-red-700 dark:text-red-300"
        >
          <p>{error}</p>
          <button
            disabled={saving}
            className="w-fit underline"
            onClick={() => setAttempt((n) => n + 1)}
          >
            Refresh assignment
          </button>
        </div>
      )}
    </section>
  );
}
