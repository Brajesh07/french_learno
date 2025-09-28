"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FrenchLevel } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { SimpleRichTextEditor } from "@/components/ui/SimpleRichTextEditor";

export default function CreateCoursePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    level: "A1" as FrenchLevel,
    content: {
      text: "",
      audioUrl: "",
      videoUrl: "",
      imageUrl: "",
    },
    isPublished: false,
    order: 0,
    prerequisites: [] as string[],
    estimatedDuration: 30,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError("Course title is required");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/admin/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create course");
      }

      const result = await response.json();
      setSuccess("Course created successfully!");

      // Redirect to the course preview page after a short delay
      setTimeout(() => {
        router.push(`/dashboard/courses/${result.courseId}`);
      }, 1500);
    } catch (err) {
      console.error("Error creating course:", err);
      setError(err instanceof Error ? err.message : "Failed to create course");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    field: string,
    value: string | number | boolean
  ) => {
    if (field.startsWith("content.")) {
      const contentField = field.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        content: {
          ...prev.content,
          [contentField]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard/courses">
            <Button variant="outline">← Back to Courses</Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Create New Course
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Add a new French learning course to your curriculum
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Basic Information
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Course Title *
              </label>
              <Input
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                placeholder="Enter course title"
                className="w-full"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                placeholder="Enter course description"
                rows={3}
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Level *
                </label>
                <select
                  value={formData.level}
                  onChange={(e) =>
                    handleInputChange("level", e.target.value as FrenchLevel)
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="A1">A1 - Beginner</option>
                  <option value="B1">B1 - Intermediate</option>
                  <option value="B2">B2 - Upper Intermediate</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Estimated Duration (minutes)
                </label>
                <Input
                  type="number"
                  value={formData.estimatedDuration}
                  onChange={(e) =>
                    handleInputChange(
                      "estimatedDuration",
                      parseInt(e.target.value) || 30
                    )
                  }
                  min="1"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Order
                </label>
                <Input
                  type="number"
                  value={formData.order}
                  onChange={(e) =>
                    handleInputChange("order", parseInt(e.target.value) || 0)
                  }
                  min="0"
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isPublished"
                checked={formData.isPublished}
                onChange={(e) =>
                  handleInputChange("isPublished", e.target.checked)
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label
                htmlFor="isPublished"
                className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
              >
                Publish immediately
              </label>
            </div>
          </div>
        </div>

        {/* Course Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Course Content
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Course Text Content
              </label>
              <SimpleRichTextEditor
                value={formData.content.text}
                onChange={(value) => handleInputChange("content.text", value)}
                placeholder="Enter the main course content..."
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Media Resources */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Media Resources
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Image URL
              </label>
              <Input
                type="url"
                value={formData.content.imageUrl}
                onChange={(e) =>
                  handleInputChange("content.imageUrl", e.target.value)
                }
                placeholder="https://example.com/image.jpg"
                className="w-full"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                URL to an image that represents this course
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Audio URL
              </label>
              <Input
                type="url"
                value={formData.content.audioUrl}
                onChange={(e) =>
                  handleInputChange("content.audioUrl", e.target.value)
                }
                placeholder="https://example.com/audio.mp3"
                className="w-full"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                URL to an audio file for pronunciation or listening exercises
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Video URL
              </label>
              <Input
                type="url"
                value={formData.content.videoUrl}
                onChange={(e) =>
                  handleInputChange("content.videoUrl", e.target.value)
                }
                placeholder="https://example.com/video.mp4"
                className="w-full"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                URL to a video lesson or demonstration
              </p>
            </div>
          </div>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Link href="/dashboard/courses">
            <Button type="button" variant="outline" className="flex-1">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={loading}
            variant="primary"
            className="flex-1"
          >
            {loading ? "Creating..." : "Create Course"}
          </Button>
        </div>
      </form>
    </div>
  );
}
