import { notFound } from "next/navigation";
import { isChallengeOpen } from "@/lib/access";
import LockedChallenge from "@/components/LockedChallenge";
import { getChallengeById, CHALLENGES } from "@/lib/challenges";
import ChallengeGameScreen from "@/components/ChallengeGameScreen";
import { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ref?: string }>;
}

export async function generateStaticParams() {
  return CHALLENGES.map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const challenge = getChallengeById(id);
  if (!challenge) return {};

  const difficultyLabel = challenge.difficulty.charAt(0).toUpperCase() + challenge.difficulty.slice(1);
  const title = `Level ${challenge.level}: ${challenge.title}`;
  const description = `${difficultyLabel} challenge · ${challenge.basePoints} pts — ${challenge.description} Can you break the AI? Free, no sign-up.`;

  return {
    title,
    description,
    alternates: { canonical: `/challenges/${challenge.id}` },
    openGraph: {
      title: `${title} — KFU Cybersecurity Club`,
      description,
    },
    twitter: {
      title: `${title} — KFU Cybersecurity Club`,
      description,
    },
  };
}

export default async function ChallengePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { ref } = await searchParams;
  const challenge = getChallengeById(id);
  if (!challenge) notFound();
  if (!isChallengeOpen(id)) return <LockedChallenge />;
  return <ChallengeGameScreen challenge={challenge} challengerName={ref} />;
}
