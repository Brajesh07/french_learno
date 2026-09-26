import { requireStaffPage } from "@/lib/staff/auth";
type AssignedStudent = {
  id: string;
  name: string | null;
  email: string;
  level: string | null;
  active: boolean;
  assignedAt: string;
};
export default async function TeacherStudentsPage() {
  const { client } = await requireStaffPage("teacher");
  const { data, error } = await client.rpc("list_assigned_students");
  if (error) throw new Error("Unable to load your assigned students.");
  const students = (data ?? []) as AssignedStudent[];
  return (
    <section className="grid gap-6">
      <header>
        <h1 className="text-3xl font-bold">My students</h1>
        <p className="mt-2 text-gray-500">
          Students currently assigned to you by an administrator.
        </p>
      </header>
      {students.length ? (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {["Student", "Email", "French level", "Status", "Assigned"].map(
                  (label) => (
                    <th key={label} scope="col" className="p-4">
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr
                  key={s.id}
                  className="border-t border-gray-100 dark:border-gray-800"
                >
                  <td className="p-4 font-medium">{s.name || "Student"}</td>
                  <td className="p-4">{s.email}</td>
                  <td className="p-4">{s.level || "Not assigned"}</td>
                  <td className="p-4">{s.active ? "Active" : "Inactive"}</td>
                  <td className="p-4">
                    {new Date(s.assignedAt).toLocaleDateString("en-GB", {
                      timeZone: "UTC",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-xl border bg-white p-8 text-gray-500 dark:border-gray-700 dark:bg-gray-900">
          No students are currently assigned to you.
        </p>
      )}
    </section>
  );
}
