"use client";

import Link from "next/link";

export default function ErrorPage({
  error,
}: {
  error: Error & { digest?: string };
}) {
  return (
    <div className="min-h-screen bg-background px-4 py-24 text-foreground">
      <div className="mx-auto max-w-xl">
        <h1 className="page-title">This page failed to load</h1>
        <p className="lede mt-4">
          {error.message || "The published files could not be read."}
        </p>
        <p className="mt-6">
          <Link href="/" className="text-accent underline underline-offset-4">
            Back to the start
          </Link>
        </p>
      </div>
    </div>
  );
}
