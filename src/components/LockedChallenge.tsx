import Link from "next/link";
import { Lock } from "lucide-react";
import { ALL_CHALLENGES_OPEN, OPEN_CHALLENGE_IDS } from "@/lib/access";
import { getChallengeById } from "@/lib/challenges";
import { AGENTIC_MISSIONS } from "@/lib/agentic/catalog";
import { GUIDED_LABS } from "@/lib/guided-labs";

function linkFor(id: string): { title: string; href: string } | null {
  const challenge = getChallengeById(id);
  if (challenge) return { title: challenge.title, href: `/challenges/${id}` };
  const mission = AGENTIC_MISSIONS.find((entry) => entry.id === id);
  if (mission) return { title: mission.title, href: `/agentic/${id}` };
  const lab = GUIDED_LABS.find((entry) => entry.id === id);
  if (lab) return { title: lab.title, href: `/labs/${id}` };
  return null;
}

/** Shown instead of a challenge that is not open yet. */
export default function LockedChallenge() {
  return (
    <div className="pt-28 pb-24 min-h-[70vh]">
      <div className="mx-auto max-w-2xl px-4 text-center">
        <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl border border-slate-700 bg-slate-900 text-emerald-300">
          <Lock className="h-7 w-7" />
        </div>
        <h1 className="text-3xl font-bold text-white">This challenge is locked</h1>
        <p dir="rtl" lang="ar" className="font-arabic mt-3 text-lg text-slate-300">هذا التحدي مقفول حاليًا. تقدر تجرّب التحديات المفتوحة تحت.</p>
        {!ALL_CHALLENGES_OPEN && (
          <div className="mt-8 grid gap-3">
            {OPEN_CHALLENGE_IDS.map((id) => {
              const entry = linkFor(id);
              return entry ? (
                <Link key={id} href={entry.href} className="lab-button lab-button-primary justify-center">
                  {entry.title} →
                </Link>
              ) : null;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
