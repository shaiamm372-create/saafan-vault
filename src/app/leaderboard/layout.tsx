import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leaderboard",
  description:
    "Global leaderboard for the KFU Cybersecurity Club AI security challenges. See the top AI red teamers worldwide. Can you crack all 16 challenges and reach #1?",
  openGraph: {
    title: "Global Leaderboard — KFU Cybersecurity Club",
    description: "Top AI red teamers worldwide. Compete across 16 prompt injection and AI agent security challenges.",
  },
};

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
