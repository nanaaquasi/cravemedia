import Link from "next/link";

const ATTRIBUTIONS = [
  { name: "TMDB", href: "https://www.themoviedb.org/" },
  { name: "Anilist", href: "https://anilist.co/" },
  { name: "Google Books", href: "https://books.google.com/" },
  { name: "Open Library", href: "https://openlibrary.org/" },
] as const;

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-white/15 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-8">
          {/* Attributions */}
          <div>
            <h3 className="font-semibold text-white text-sm mb-2">Attributions</h3>
            <ul className="flex flex-col gap-1 text-sm text-zinc-400">
              {ATTRIBUTIONS.map(({ name, href }) => (
                <li key={name}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-zinc-300 transition-colors"
                  >
                    {name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-white text-sm mb-2">Legal</h3>
            <ul className="flex flex-col gap-1 text-sm text-zinc-400">
              <li>
                <Link href="/privacy" className="hover:text-zinc-300 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-zinc-300 transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <p className="mt-6 text-sm text-zinc-500">© {currentYear} craveo</p>
      </div>
    </footer>
  );
}
