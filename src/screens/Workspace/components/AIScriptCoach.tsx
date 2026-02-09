import React, { useMemo } from 'react';
import {
  scoreSegment,
  SCORING_RULES,
  hasQuestion,
  hasNumber,
  hasNegativeFrame,
  hasForeshadow,
  hasCtaAction,
  hasFirstPersonCta,
  detectPowerWords,
  type SegmentType,
  type ScoringWeight,
} from '../../../lib/knowledge/12-scoring-engine';
import {
  analyzeEmotion,
  EMOTION_COLORS,
  type EmotionType,
} from '../../../lib/knowledge/13-emotion-lexicon';

// ============================================================================
// TYPES
// ============================================================================

interface SegmentInput {
  id: string;
  segmentType: string;
  script: string;
  durationSeconds: number;
  maxWords: number;
  emotion: string;
  isEnabled?: boolean;
}

interface CoachAnalysis {
  segmentType: string;
  score: number;
  strengths: Array<{ key: string; label: string; points: number }>;
  weaknesses: Array<{ key: string; label: string; weight: number; tip: string }>;
  powerWords: string[];
  emotionDominant: EmotionType;
  emotionIntensity: number;
  flags: string[];
}

interface AIScriptCoachProps {
  segments: SegmentInput[];
  focusedSegmentId: string | null;
  language?: string;
  onApplySuggestion?: (segmentId: string, field: 'script' | 'visualDirection', value: string) => void;
}

// ============================================================================
// FEATURE EXTRACTION
// ============================================================================

const FEATURE_LABELS: Record<string, string> = {
  has_question: 'Question hook',
  has_number: 'Number/statistic',
  has_power_word: 'Power word',
  has_negative_frame: 'Negative framing',
  word_density_optimal: 'Word density',
  under_word_limit: 'Under word limit',
  has_pattern_interrupt: 'Pattern interrupt',
  matches_hook_category: 'Hook category match',
  has_foreshadow: 'Foreshadow/open loop',
  has_transition: 'Smooth transition',
  builds_on_hook: 'Builds on hook',
  has_specific_detail: 'Specific detail',
  has_transition_word: 'Transition word',
  has_value_delivery: 'Value delivery',
  has_emotional_climax: 'Emotional climax',
  has_unexpected_twist: 'Unexpected twist',
  has_specific_proof: 'Specific proof',
  emotional_intensity_high: 'Emotional intensity',
  has_clear_action: 'Clear CTA action',
  first_person: 'First-person CTA',
  single_focus: 'Single focus',
  has_urgency_word: 'Urgency word',
  matches_funnel_stage: 'Funnel stage match',
  mirrors_hook_energy: 'Mirrors hook energy',
  has_callback: 'Callback to hook',
  emotional_match: 'Emotion match w/ hook',
};

const FEATURE_TIPS: Record<string, string> = {
  has_question: 'Add a question to spark curiosity (+23% shares)',
  has_number: 'Include a number or stat (+36% CTR)',
  has_power_word: 'Use emotional/urgency words (+2.3% CTR per word)',
  has_negative_frame: 'Try negative framing like "stop" or "jangan" (+63% CTR)',
  word_density_optimal: 'Aim for 70-90% word density for natural pacing',
  under_word_limit: 'Reduce word count to stay within the time limit',
  has_pattern_interrupt: 'Add a surprise element to reset attention (+17pp retention)',
  has_foreshadow: 'Add "tunggu..." or "but first..." to create open loops',
  has_transition: 'Smooth the transition from the previous segment',
  builds_on_hook: 'Connect back to what the hook promised',
  has_specific_detail: 'Replace vague claims with specific numbers/examples',
  has_transition_word: 'Add "tapi", "nah", or "but" to signal new info',
  has_value_delivery: 'Deliver concrete value — teach something actionable',
  has_emotional_climax: 'Make this the most emotionally intense moment',
  has_unexpected_twist: 'Add a surprising reveal for replay value',
  has_specific_proof: 'Add social proof or authority data',
  emotional_intensity_high: 'Use more intense emotional language',
  has_clear_action: 'Add an explicit action verb (follow, save, click)',
  first_person: 'Use first-person framing ("Get my...") for +90% CTR',
  single_focus: 'Keep to ONE action — multiple CTAs = -73% clicks',
  has_urgency_word: 'Add genuine urgency (sekarang, limited, today)',
  matches_funnel_stage: 'Match CTA to viewer awareness stage',
  mirrors_hook_energy: 'Match energy level to hook for seamless loop',
  has_callback: 'Reference something from the hook ("remember...")',
  emotional_match: 'Match emotion tone to hook (within ±0.2 intensity)',
};

function extractFeatures(
  text: string,
  wordCount: number,
  maxWords: number,
  language: string,
): Record<string, boolean | number> {
  const density = maxWords > 0 ? wordCount / maxWords : 0;
  const optimalDensity =
    density >= 0.7 && density <= 0.9
      ? 1
      : density > 0.9
        ? Math.max(0, 1 - (density - 0.9) * 5)
        : density / 0.7;

  return {
    has_question: hasQuestion(text),
    has_number: hasNumber(text),
    has_power_word: detectPowerWords(text, language).length > 0,
    has_negative_frame: hasNegativeFrame(text),
    word_density_optimal: optimalDensity,
    under_word_limit: wordCount <= maxWords,
    has_pattern_interrupt: hasForeshadow(text),
    has_foreshadow: hasForeshadow(text),
    has_transition: 0.5,
    builds_on_hook: 0.5,
    has_specific_detail: hasNumber(text) ? 1 : 0.5,
    has_transition_word: /\b(tapi|nah|but|however|terus|dan|lalu|लेकिन|फिर)\b/i.test(text),
    has_value_delivery: 0.5,
    has_emotional_climax: 0.5,
    has_unexpected_twist: 0.5,
    has_specific_proof: hasNumber(text) ? 1 : 0.5,
    emotional_intensity_high: 0.5,
    has_clear_action: hasCtaAction(text),
    first_person: hasFirstPersonCta(text),
    single_focus: 0.5,
    has_urgency_word: /\b(sekarang|now|segera|today|limited|hurry|अभी|जल्दी)\b/i.test(text),
    matches_funnel_stage: 0.5,
    matches_hook_category: 0.5,
    mirrors_hook_energy: 0.5,
    has_callback: 0.5,
    emotional_match: 0.5,
  };
}

// ============================================================================
// ANALYSIS
// ============================================================================

function analyzeSegment(segment: SegmentInput, language: string): CoachAnalysis {
  const st = segment.segmentType.startsWith('BODY') ? 'BODY' : segment.segmentType as SegmentType;
  const words = segment.script.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const features = extractFeatures(segment.script, wordCount, segment.maxWords, language);
  const result = scoreSegment(st, features);
  const rules = SCORING_RULES[st] || {};

  const strengths: CoachAnalysis['strengths'] = [];
  const weaknesses: CoachAnalysis['weaknesses'] = [];

  for (const [key, rule] of Object.entries(rules)) {
    const points = result.breakdown[key] ?? 0;
    if (points > 0 && points >= rule.weight * 0.5) {
      strengths.push({
        key,
        label: FEATURE_LABELS[key] || key,
        points,
      });
    } else {
      weaknesses.push({
        key,
        label: FEATURE_LABELS[key] || key,
        weight: rule.weight,
        tip: FEATURE_TIPS[key] || '',
      });
    }
  }

  // Sort: strengths by points desc, weaknesses by weight desc
  strengths.sort((a, b) => b.points - a.points);
  weaknesses.sort((a, b) => b.weight - a.weight);

  const powerWords = detectPowerWords(segment.script, language).map((pw) => pw.word);
  const emotionResult = analyzeEmotion(segment.script, language);

  return {
    segmentType: segment.segmentType,
    score: result.total,
    strengths,
    weaknesses,
    powerWords,
    emotionDominant: emotionResult.dominant,
    emotionIntensity: emotionResult.intensity,
    flags: result.flags,
  };
}

// ============================================================================
// SCORE BAR
// ============================================================================

const ScoreBar: React.FC<{ label: string; value: number; max: number }> = ({ label, value, max }) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[9px]">
        <span className="text-[#A8A29E]">{label}</span>
        <span className="font-mono text-[#78716C]">{value}/{max}</span>
      </div>
      <div className="h-1 bg-[#262626] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENT
// ============================================================================

export const AIScriptCoach: React.FC<AIScriptCoachProps> = ({
  segments,
  focusedSegmentId,
  language = 'id',
  onApplySuggestion,
}) => {
  const focusedSegment = useMemo(
    () => segments.find((s) => s.id === focusedSegmentId),
    [segments, focusedSegmentId],
  );

  const analysis = useMemo(() => {
    if (!focusedSegment) return null;
    return analyzeSegment(focusedSegment, language);
  }, [focusedSegment, language]);

  // No segment focused
  if (!focusedSegment || !analysis) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-8 h-8 rounded-full bg-[#161616] border border-[#262626] flex items-center justify-center mb-3">
          <span className="text-[14px]">&#127919;</span>
        </div>
        <p className="text-[11px] text-[#57534E] leading-relaxed px-4">
          Click a segment card to see AI coaching suggestions
        </p>
      </div>
    );
  }

  const emotionColors = EMOTION_COLORS[analysis.emotionDominant];
  const st = analysis.segmentType.startsWith('BODY') ? 'BODY' : analysis.segmentType as SegmentType;
  const rules = SCORING_RULES[st] || {};

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-emerald-400">
            {analysis.segmentType}
          </span>
          <span className="text-[9px] text-[#57534E]">analysis</span>
        </div>
        <span className={`text-[11px] font-mono font-bold ${analysis.score >= 70 ? 'text-emerald-400' : analysis.score >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
          {analysis.score}%
        </span>
      </div>

      {/* Emotion chip */}
      <div className="flex items-center gap-1.5">
        <span className={`text-[9px] px-1.5 py-0.5 rounded ${emotionColors?.bg ?? 'bg-[#262626]'} ${emotionColors?.text ?? 'text-[#78716C]'}`}>
          {analysis.emotionDominant}
        </span>
        <span className="text-[9px] text-[#57534E]">
          intensity {Math.round(analysis.emotionIntensity * 100)}%
        </span>
      </div>

      {/* Strengths */}
      {analysis.strengths.length > 0 && (
        <div>
          <span className="text-[9px] font-semibold text-emerald-500/70 uppercase tracking-wider">
            Strengths
          </span>
          <div className="mt-1 space-y-0.5">
            {analysis.strengths.map((s) => (
              <div key={s.key} className="flex items-start gap-1 text-[10px]">
                <span className="text-emerald-400 flex-shrink-0 mt-px">&#10003;</span>
                <span className="text-[#A8A29E]">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weaknesses */}
      {analysis.weaknesses.length > 0 && (
        <div>
          <span className="text-[9px] font-semibold text-amber-500/70 uppercase tracking-wider">
            Improve
          </span>
          <div className="mt-1 space-y-1.5">
            {analysis.weaknesses.map((w) => (
              <div key={w.key} className="space-y-0.5">
                <div className="flex items-start gap-1 text-[10px]">
                  <span className="text-amber-400 flex-shrink-0 mt-px">&#9888;</span>
                  <span className="text-[#A8A29E]">{w.label}</span>
                  <span className="text-[8px] text-[#57534E] ml-auto">{w.weight}pt</span>
                </div>
                {w.tip && (
                  <p className="text-[9px] text-[#57534E] pl-3.5 leading-relaxed">{w.tip}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Power Words */}
      {analysis.powerWords.length > 0 && (
        <div>
          <span className="text-[9px] font-semibold text-[#57534E] uppercase tracking-wider">
            Power Words Found
          </span>
          <div className="flex flex-wrap gap-1 mt-1">
            {analysis.powerWords.map((pw, i) => (
              <span
                key={i}
                className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              >
                {pw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Score Breakdown */}
      <div>
        <span className="text-[9px] font-semibold text-[#57534E] uppercase tracking-wider">
          Score Breakdown
        </span>
        <div className="mt-1.5 space-y-1.5">
          {Object.entries(rules).map(([key, rule]) => (
            <ScoreBar
              key={key}
              label={FEATURE_LABELS[key] || key}
              value={analysis.strengths.find((s) => s.key === key)?.points ?? 0}
              max={rule.weight}
            />
          ))}
        </div>
      </div>

      {/* Flags */}
      {analysis.flags.length > 0 && (
        <div className="border-t border-[#262626] pt-2">
          <span className="text-[9px] font-semibold text-red-400/70 uppercase tracking-wider">
            Flags
          </span>
          <div className="mt-1 space-y-0.5">
            {analysis.flags.map((flag, i) => (
              <p key={i} className="text-[9px] text-[#A8A29E]">{flag}</p>
            ))}
          </div>
        </div>
      )}

      {/* LLM Suggestions stub */}
      <div className="border-t border-[#262626] pt-2">
        <button
          type="button"
          disabled
          className="w-full py-2 rounded-lg text-[10px] font-medium border border-[#262626] bg-[#161616] text-[#57534E] cursor-not-allowed"
        >
          AI Rewrite Suggestions (coming soon)
        </button>
      </div>
    </div>
  );
};
