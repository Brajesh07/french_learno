"use client";

import React from "react";

export default function BasicTestPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "white",
        padding: "20px",
        color: "black",
      }}
    >
      <h1 style={{ fontSize: "24px", marginBottom: "16px" }}>
        Basic Test Page
      </h1>
      <p>This is a simple test to check if anything renders at all.</p>
      <div
        style={{
          backgroundColor: "#f3f4f6",
          padding: "20px",
          marginTop: "20px",
          borderRadius: "8px",
        }}
      >
        <h2>Test Content</h2>
        <p>If you can see this, the page is working.</p>
      </div>
    </div>
  );
}
