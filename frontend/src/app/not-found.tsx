import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center p-4 text-center">
      <h2 className="text-2xl font-bold mb-2">Page Not Found</h2>
      <p className="text-sm text-slate-500 mb-4">Could not find requested resource</p>
      <Link 
        href="/dashboard"
        className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}
