import { notFound } from "next/navigation";
import { getChallengeById, CHALLENGES } from "@/lib/challenges";
import ChallengeGameScreen from "@/components/ChallengeGameScreen";
import { Metadata } from "next";
import { arDifficulty } from "@/lib/i18n/ar";
import { BRAND } from "@/lib/brand";

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

  const difficultyLabel = arDifficulty(challenge.difficulty);
  const title = `المستوى ${challenge.level}: ${challenge.title}`;
  const description = `تحدٍّ ${difficultyLabel} · ${challenge.basePoints} نقطة — ${challenge.description} هل تستطيع اختراقه؟ مجاني وبدون تسجيل.`;

  return {
    title,
    description,
    alternates: { canonical: `/challenges/${challenge.id}` },
    openGraph: {
      title: `${title} — ${BRAND.vault}`,
      description,
    },
    twitter: {
      title: `${title} — ${BRAND.vault}`,
      description,
    },
  };
}

export default async function ChallengePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { ref } = await searchParams;
  const challenge = getChallengeById(id);
  if (!challenge) notFound();
  return <ChallengeGameScreen challenge={challenge} challengerName={ref} />;
}
