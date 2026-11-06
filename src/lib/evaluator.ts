/**
 * Server-only evaluator — do NOT import this in client components.
 * Client components should import from attack-metadata.ts instead.
 */
import { AttackResult, Challenge, ConversationMessage } from "@/types";
import { getAIBackend, PatternMatchingBackend, BackendMessage } from "./ai-backend";
import { arAttackType } from "./i18n/ar";
import { arGrader } from "./i18n/grader-ar";

// Re-export client-safe metadata so existing imports still resolve
export { ATTACK_TYPE_INFO, computeAttackSpans, detectAttackType } from "./attack-metadata";

// ─── Main evaluation entry point (server-only) ────────────────────────────────

export async function evaluateAttack(
  userPrompt: string,
  challenge: Challenge,
  timeElapsed: number,
  hintsUsed: number,
  history: ConversationMessage[] = [],
  practice = false
): Promise<AttackResult> {
  const backend = practice ? new PatternMatchingBackend() : getAIBackend();

  const backendHistory: BackendMessage[] = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const result = await backend.evaluate(
    challenge.systemPrompt,
    userPrompt,
    backendHistory,
    challenge.successPatterns,
    challenge.id
  );

  const userTurnCount = history.filter((message) => message.role === "user").length + 1;
  // Deliberately not derived from isMultiTurn — that flag only selects the chat
  // UI, and level 7 uses it while still being winnable on the first message.
  const minimumUserTurns = challenge.minimumUserTurns ?? 1;
  const meetsTurnRequirement = userTurnCount >= minimumUserTurns;

  if (!result.defended && meetsTurnRequirement) {
    let pointsEarned = challenge.basePoints;
    const timeFraction = timeElapsed / challenge.timeLimit;
    if (timeFraction < 0.5) pointsEarned += 75;
    pointsEarned -= hintsUsed * 25;
    pointsEarned = Math.max(pointsEarned, Math.floor(challenge.basePoints * 0.25));

    return {
      success: true,
      aiResponse: result.response,
      attackType: result.detectedAttackType,
      feedback: challenge.successMessage,
      explanation: challenge.explanation,
      pointsEarned,
      backendName: backend.name,
      isLiveBackend: backend.isLive,
    };
  }

  return {
    success: false,
    aiResponse: result.response,
    attackType: result.detectedAttackType,
    feedback: result.detectedAttackType
      ? `رُصدت محاولة ${arAttackType(result.detectedAttackType).name}، وصمد النظام. جرّب محورًا مختلفًا.`
      : "حافظ النظام على قيوده. حلّل تعليمات النظام بعناية أكبر.",
    explanation: !meetsTurnRequirement
      ? `يتطلب هذا التحدي ${minimumUserTurns} رسائل منك على الأقل، وهذه رسالتك رقم ${userTurnCount}.`
      : arGrader(result.explanation),
    backendName: backend.name,
    isLiveBackend: backend.isLive,
  };
}
