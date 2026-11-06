import { notFound } from "next/navigation";
import { AGENTIC_MISSIONS, LAB_BRIEFINGS } from "@/lib/agentic/catalog";
import AgenticMissionScreen from "@/components/AgenticMissionScreen";
import { AR_MISSION_TITLES } from "@/lib/i18n/agentic-ar";

export async function generateStaticParams() {
  return AGENTIC_MISSIONS.filter((mission) => mission.status === "available").map((mission) => ({ id: mission.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mission = AGENTIC_MISSIONS.find((entry) => entry.id === id && entry.status === "available");
  return { title: mission ? `${AR_MISSION_TITLES[mission.id] ?? mission.title} · مختبر الوكلاء` : "المهمة غير متاحة" };
}

export default async function MissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mission = AGENTIC_MISSIONS.find((entry) => entry.id === id && entry.status === "available");
  if (!mission || !LAB_BRIEFINGS[id]) notFound();
  return <AgenticMissionScreen key={id} mission={mission} briefing={LAB_BRIEFINGS[id]} />;
}
