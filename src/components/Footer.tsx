import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-white/15 py-8 px-4">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-500">
        <span>© {currentYear} craveo</span>
        <nav className="flex items-center gap-6">
          <Link href="/" className="hover:text-zinc-300 transition-colors">
            Home
          </Link>
          <Link
            href="/search"
            className="hover:text-zinc-300 transition-colors"
          >
            Search
          </Link>
        </nav>
      </div>
    </footer>
  );
}
