"use client";
import { useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";

const fieldClass =
  "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-base text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white";

type InputFieldProps = {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  pattern?: string;
  maxLength?: number;
  minLength?: number;
  placeholder?: string;
  textarea?: boolean;
  rows?: number;
};

export function InputField({
  label,
  name,
  type = "text",
  autoComplete,
  required,
  pattern,
  maxLength,
  minLength,
  placeholder,
  textarea,
  rows,
}: InputFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  return (
    <label className="block text-sm">
      {label}
      {textarea ? (
        <textarea
          name={name}
          maxLength={maxLength}
          rows={rows}
          className={fieldClass}
        />
      ) : isPassword ? (
        <div className="relative">
          <input
            name={name}
            type={showPassword ? "text" : "password"}
            autoComplete={autoComplete}
            required={required}
            pattern={pattern}
            maxLength={maxLength}
            minLength={minLength}
            placeholder={placeholder}
            className={`${fieldClass} pr-10`}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            {showPassword ? <FiEyeOff /> : <FiEye />}
          </button>
        </div>
      ) : (
        <input
          name={name}
          type={type}
          autoComplete={autoComplete}
          required={required}
          pattern={pattern}
          maxLength={maxLength}
          minLength={minLength}
          placeholder={placeholder}
          className={fieldClass}
        />
      )}
    </label>
  );
}
