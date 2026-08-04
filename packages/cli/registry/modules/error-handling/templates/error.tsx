"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center p-8 text-center">
      <h1 className="text-3xl font-bold">Something went wrong</h1>
      <p className="mt-3 text-sm text-zinc-600">
        The error was logged with a safe, non-sensitive description. Reload or try again.
      </p>
      <button
        className="mt-6 rounded-md bg-zinc-900 px-4 py-2 text-sm text-white"
        onClick={reset}
      >
        Try again
      </button>
      {error instanceof Error && process.env.NODE_ENV === "development" ? (
        <pre className="mt-6 w-full overflow-auto rounded-lg bg-zinc-100 p-4 text-left text-xs text-zinc-700">
          {error.message}
        </pre>
      ) : null}
    </main>
  );
}