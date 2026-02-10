import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-600 mb-4">404</h1>
        <p className="text-gray-400 mb-6">Page not found</p>
        <Link
          href="/dashboard"
          className="bg-[var(--primary)] text-white px-4 py-2 rounded hover:bg-[var(--primary)]/80"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
