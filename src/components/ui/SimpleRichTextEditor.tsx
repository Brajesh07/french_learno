"use client";

import React, { useState, useRef } from "react";
import { cn } from "@/lib/utils";

interface SimpleRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SimpleRichTextEditor: React.FC<SimpleRichTextEditorProps> = ({
  value,
  onChange,
  placeholder,
  className,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const formatText = (command: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    let formattedText = selectedText;
    const before = value.substring(0, start);
    const after = value.substring(end);

    switch (command) {
      case "bold":
        formattedText = `**${selectedText}**`;
        break;
      case "italic":
        formattedText = `*${selectedText}*`;
        break;
      case "underline":
        formattedText = `_${selectedText}_`;
        break;
      case "code":
        formattedText = `\`${selectedText}\``;
        break;
    }

    const newValue = before + formattedText + after;
    onChange(newValue);

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + formattedText.length - selectedText.length,
        start + formattedText.length
      );
    }, 0);
  };

  const insertList = (type: "ordered" | "unordered") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const prefix = type === "ordered" ? "1. " : "- ";
    const before = value.substring(0, start);
    const after = value.substring(start);

    const newValue = before + prefix + after;
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length);
    }, 0);
  };

  return (
    <div
      className={cn(
        "border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden",
        isFocused && "ring-2 ring-blue-500 ring-opacity-20 border-blue-500",
        className
      )}
    >
      {/* Toolbar */}
      <div className="border-b border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => formatText("bold")}
            className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-sm font-bold"
            title="Bold"
          >
            B
          </button>
          <button
            type="button"
            onClick={() => formatText("italic")}
            className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-sm italic"
            title="Italic"
          >
            I
          </button>
          <button
            type="button"
            onClick={() => formatText("underline")}
            className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-sm underline"
            title="Underline"
          >
            U
          </button>
          <button
            type="button"
            onClick={() => formatText("code")}
            className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-sm font-mono"
            title="Code"
          >
            {"</>"}
          </button>

          <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-2" />

          <button
            type="button"
            onClick={() => insertList("unordered")}
            className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-sm"
            title="Bullet List"
          >
            •
          </button>
          <button
            type="button"
            onClick={() => insertList("ordered")}
            className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-sm"
            title="Numbered List"
          >
            1.
          </button>
        </div>
      </div>

      {/* Text Area */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className="w-full min-h-[120px] p-3 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-vertical border-0 focus:outline-none"
        style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
      />

      {/* Help Text */}
      <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        Use **bold**, *italic*, _underline_, `code` for formatting
      </div>
    </div>
  );
};
