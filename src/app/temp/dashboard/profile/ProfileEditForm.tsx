"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "../actions";

interface Profile {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string | null;
  class: string | null;
}

export function ProfileEditForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await updateProfile(formData);

    setLoading(false);
    if (result?.error) {
      setError(result.error);
    } else {
      setEditing(false);
      router.refresh();
    }
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="w-full flex items-center justify-between px-5 py-4 bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.06)] text-left"
      >
        <span className="text-[14px] font-semibold text-[#111111]">
          Edit Profile
        </span>
        <svg
          className="w-4 h-4 text-[#999999]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.232 5.232l3.536 3.536M9 13l6.293-6.293a1 1 0 011.414 0l1.586 1.586a1 1 0 010 1.414L12 16H9v-3z"
          />
        </svg>
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-[20px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] flex flex-col gap-4"
    >
      <h3 className="text-[15px] font-bold text-[#111111]">Edit Profile</h3>

      {error && (
        <p className="text-[12px] text-red-600 bg-red-50 rounded-[12px] px-3 py-2">
          {error}
        </p>
      )}

      <Field label="Full Name" name="name" defaultValue={profile.name} />
      <Field
        label="Phone"
        name="phone"
        defaultValue={profile.phone ?? ""}
        placeholder="Optional"
      />
      <Field
        label="Class / Level Group"
        name="class"
        defaultValue={profile.class ?? ""}
        placeholder="e.g. A1 Beginners"
      />

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="flex-1 h-11 rounded-[14px] border border-[#E5E5E5] text-[14px] font-semibold text-[#555555] transition-colors hover:bg-[#F5F5F7]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 h-11 rounded-[14px] bg-[#A78BFA] text-[14px] font-semibold text-[#111111] transition-opacity disabled:opacity-60"
        >
          {loading ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue: string;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold text-[#999999] uppercase tracking-wide">
        {label}
      </label>
      <input
        type="text"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="h-11 rounded-[12px] bg-[#F5F5F7] border border-[#E5E5E5] px-4 text-[14px] text-[#111111] placeholder:text-[#BBBBBB] outline-none focus:border-[#A78BFA] focus:ring-2 focus:ring-[#A78BFA]/20 transition-all"
      />
    </div>
  );
}
