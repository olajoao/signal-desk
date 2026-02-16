import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-8xl font-black text-[var(--border-strong)] mb-4">404</h1>
        <p className="text-[var(--muted)] mb-6">Page not found</p>
        <Link
          href="/dashboard"
          className="bg-[var(--accent)] text-black px-4 py-2 rounded font-medium hover:bg-[var(--accent-dim)]"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
