import Link from "next/link";
import { BRAND } from "@/lib/brand";

export default function Footer() {
  return (
    <footer className="site-footer mt-auto">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-12">
        <div className="platform-footer-grid">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BRAND.logo} alt={`${BRAND.nameAr} · ${BRAND.name} · ${BRAND.university}`} className="footer-logo" />
            <p className="mt-4">AI security lessons and synthetic labs. Learn the boundary, build a useful defense, and retain the evidence.</p>
          </div>
          <nav aria-label="Learning resources">
            <strong>Explore</strong>
            <Link href="/learn">Learning path</Link>
            <Link href="/challenges?track=llm">LLM CTF</Link>
            <Link href="/agentic">Agentic CTF</Link>
            <Link href="/challenges?view=labs">All labs & guided defenses</Link>
            <Link href="/research">Research</Link>
            <Link href="/community">Community notes</Link>
            <Link href="/leaderboard">Leaderboard</Link>
          </nav>
        </div>
        <div className="platform-footer-bottom">
          <span>© {new Date().getFullYear()} {BRAND.owner} · {BRAND.university}</span>
          <a href={`mailto:${BRAND.ownerEmail}`}>{BRAND.ownerEmail}</a>
        </div>
      </div>
    </footer>
  );
}
