import { ImageResponse } from "next/og";
import { getChallengeById } from "@/lib/challenges";
import { SITE_HOST } from "@/lib/brand";

export const runtime = "edge";
export const alt = "Prompt Injection CTF Challenge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "#e0b04a",
  medium: "#facc15",
  hard: "#fb923c",
  expert: "#f87171",
  legendary: "#c084fc",
};

const ATTACK_ICONS: Record<string, string> = {
  "prompt-injection": "💉",
  jailbreak: "🔓",
  "intent-drift": "🌊",
  "token-smuggling": "📦",
  "multi-vector": "⚡",
  "indirect-injection": "📄",
  "agent-tool-abuse": "🤖",
};

export default async function OGImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const challenge = getChallengeById(id);
  if (!challenge) {
    return new ImageResponse(
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#15110d", color: "white", alignItems: "center", justifyContent: "center", fontSize: 48 }}>
        Saafan&apos;s Vault · KFU Cyber Security Club
      </div>,
      { ...size }
    );
  }

  const diffColor = DIFFICULTY_COLORS[challenge.difficulty] ?? "#ab9e8b";
  const icon = ATTACK_ICONS[challenge.attackType] ?? "🎯";

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: "linear-gradient(135deg, #15110d 0%, #241f1a 100%)",
        padding: "60px 80px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#e0b04a", fontSize: 20, fontWeight: 700 }}>
          <span>🛡️</span>
          <span>SAAFAN&apos;S VAULT · KFU CYBER SECURITY CLUB</span>
        </div>
      </div>

      {/* Main content */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ fontSize: 56 }}>{icon}</span>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ color: "#ab9e8b", fontSize: 22, fontWeight: 600 }}>Level {challenge.level}</div>
            <div style={{ color: "white", fontSize: 48, fontWeight: 800, lineHeight: 1.1 }}>{challenge.titleEn ?? challenge.title}</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "8px" }}>
          <div
            style={{
              display: "flex",
              padding: "6px 16px",
              borderRadius: "8px",
              background: `${diffColor}20`,
              border: `2px solid ${diffColor}50`,
              color: diffColor,
              fontSize: 18,
              fontWeight: 700,
              textTransform: "uppercase",
            }}
          >
            {challenge.difficulty}
          </div>
          <div style={{ color: "#ab9e8b", fontSize: 20 }}>•</div>
          <div style={{ color: "white", fontSize: 22, fontWeight: 700 }}>{challenge.basePoints} pts</div>
          <div style={{ color: "#ab9e8b", fontSize: 20 }}>•</div>
          <div style={{ color: "#ab9e8b", fontSize: 20 }}>Can you break the AI?</div>
        </div>
      </div>

      {/* Bottom */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
        <div style={{ color: "#665b4f", fontSize: 18 }}>{SITE_HOST}</div>
        <div style={{ color: "#665b4f", fontSize: 18 }}>Free · No sign-up · Based on Prompt Injection CTF (MIT)</div>
      </div>
    </div>,
    { ...size }
  );
}
