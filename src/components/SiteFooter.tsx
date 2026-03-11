import Link from "next/link";

const ATTRIBUTIONS = ["TMDB", "Anilist", "Google Books", "Open Library"];

export function SiteFooter() {
  return (
    <footer className="mt-12 pt-8 pb-8 border-t border-white/10">
      <div className="flex flex-col sm:flex-row sm:items-start gap-6 sm:gap-10">
        {/* Attributions */}
        <div>
          <h3 className="text-sm font-bold text-white mb-3">Attributions</h3>
          <ul className="space-y-1.5 text-sm text-zinc-400">
            {ATTRIBUTIONS.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </div>

        {/* Legal */}
        <div>
          <h3 className="text-sm font-bold text-white mb-3">Legal</h3>
          <ul className="space-y-1.5 text-sm text-zinc-400">
            <li>
              <Link
                href="/privacy"
                className="hover:text-white transition-colors"
              >
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link
                href="/terms"
                className="hover:text-white transition-colors"
              >
                Terms of Service
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <p className="mt-8 text-sm text-zinc-500">
        © {new Date().getFullYear()} craveo
      </p>
    </footer>
  );
}
