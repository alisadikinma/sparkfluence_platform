import React, { useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../contexts/AuthContext";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { 
  Loader2, 
  Sparkles, 
  RefreshCw, 
  BarChart3, 
  CheckCircle2, 
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  Check
} from "lucide-react";

interface ScriptSegment {
  segment_type: string;
  segment_number: number;
  start_time: number;
  end_time: number;
  duration: number;
  script_text: string;
  visual_direction: string;
  emotional_label?: string;
  scene_transition?: string;
  shot_type?: string;
}

interface GeneratedScript {
  title: string;
  segments: ScriptSegment[];
  total_duration: number;
  language: string;
}

interface GapAnalysisResult {
  overall_score: number;
  criteria: {
    name: string;
    score: number;
    max_score: number;
    gap_details: string;
    status: "pass" | "warning" | "fail";
  }[];
  recommendations: string[];
  summary: string;
}

export const ScriptGenTab: React.FC = () => {
  const { user } = useAuth();
  
  // Form state
  const [topic, setTopic] = useState("");
  const [language, setLanguage] = useState("indonesian");
  const [duration, setDuration] = useState("60");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [useDnaTone, setUseDnaTone] = useState(false);
  
  // Output state
  const [sparkfluenceOutput, setSparkfluenceOutput] = useState<GeneratedScript | null>(null);
  const [claudeReference, setClaudeReference] = useState("");
  const [rawSparkfluenceJson, setRawSparkfluenceJson] = useState("");
  
  // Loading/error state
  const [generating, setGenerating] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Analysis state
  const [gapAnalysis, setGapAnalysis] = useState<GapAnalysisResult | null>(null);
  
  // UI state
  const [showRawJson, setShowRawJson] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError("Please enter a topic");
      return;
    }

    setGenerating(true);
    setError(null);
    setGapAnalysis(null);

    try {
      // Call existing generate-script Edge Function
      const { data, error: fnError } = await supabase.functions.invoke('generate-script', {
        body: {
          input_type: 'topic',
          content: topic.trim(),
          duration: duration,
          aspect_ratio: aspectRatio,
          platform: aspectRatio === "9:16" ? 'tiktok' : 'youtube',
          language: language,
          user_id: user?.id,
          use_dna_tone: useDnaTone,
        }
      });

      if (fnError) throw fnError;
      
      if (data?.success && data?.data) {
        setSparkfluenceOutput(data.data);
        setRawSparkfluenceJson(JSON.stringify(data.data, null, 2));
      } else {
        throw new Error(data?.error?.message || "Failed to generate script");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyJson = () => {
    if (rawSparkfluenceJson) {
      navigator.clipboard.writeText(rawSparkfluenceJson);
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    }
  };

  const handleAnalyzeGap = async () => {
    if (!sparkfluenceOutput || !claudeReference.trim()) {
      setError("Both Sparkfluence output and Claude reference are required for analysis");
      return;
    }

    setAnalyzing(true);
    setError(null);

    // Mock analysis - will be replaced with real LLM analysis
    await new Promise(resolve => setTimeout(resolve, 1000));
    setGapAnalysis(generateAnalysis(sparkfluenceOutput, claudeReference));
    setAnalyzing(false);
  };

  const generateAnalysis = (output: GeneratedScript, reference: string): GapAnalysisResult => {
    const segments = output.segments || [];
    
    // Analyze hook quality
    const hookSegment = segments.find(s => s.segment_type?.toUpperCase() === 'HOOK');
    const hasHook = !!hookSegment;
    const hookHasQuestion = hookSegment?.script_text?.includes('?') || false;
    const hookHasTrigger = hookSegment?.script_text?.toLowerCase().match(/(gila|shocking|rahasia|stop|jangan|kenapa)/i);
    
    // Analyze foreshadow
    const foreSegment = segments.find(s => s.segment_type?.toUpperCase().includes('FORE'));
    const hasForeshadow = !!foreSegment;
    const foreshadowHasLock = foreSegment?.script_text?.toLowerCase().match(/(sampai habis|terakhir|ketiga|akhir)/i);
    
    // Analyze CTA
    const ctaSegment = segments.find(s => s.segment_type?.toUpperCase() === 'CTA');
    const hasCta = !!ctaSegment;
    const ctaHasAction = ctaSegment?.script_text?.toLowerCase().match(/(follow|share|comment|like|save)/i);
    
    // Analyze slang (for Indonesian)
    const allText = segments.map(s => s.script_text).join(' ');
    const hasGue = allText.match(/\bgue\b/gi)?.length || 0;
    const hasLo = allText.match(/\blo\b/gi)?.length || 0;
    const hasParticles = allText.match(/\b(sih|tuh|gitu|dong|deh|nih|kan)\b/gi)?.length || 0;
    const hasSaya = allText.match(/\bsaya\b/gi)?.length || 0;
    const hasKamu = allText.match(/\bkamu\b/gi)?.length || 0;
    
    // Analyze visual direction
    const avgVisualLength = segments.reduce((sum, s) => sum + (s.visual_direction?.length || 0), 0) / segments.length;
    const visualHasCamera = segments.some(s => s.visual_direction?.toLowerCase().match(/(cu|mcu|ms|ws|close-up|medium|wide)/i));
    const visualHasLighting = segments.some(s => s.visual_direction?.toLowerCase().match(/(lighting|rembrandt|loop|butterfly)/i));
    
    // Calculate scores
    const hookScore = hasHook ? (hookHasQuestion ? 8 : 6) + (hookHasTrigger ? 2 : 0) : 2;
    const foreshadowScore = hasForeshadow ? (foreshadowHasLock ? 9 : 5) : 2;
    const bodyScore = segments.filter(s => s.segment_type?.toUpperCase().includes('BODY')).length >= 2 ? 8 : 5;
    const ctaScore = hasCta ? (ctaHasAction ? 8 : 5) : 2;
    
    // Slang score (Indonesian specific)
    const slangScore = language === 'indonesian' 
      ? Math.min(10, (hasGue > 0 ? 3 : 0) + (hasLo > 0 ? 3 : 0) + (hasParticles > 0 ? 2 : 0) + (hasSaya === 0 && hasKamu === 0 ? 2 : 0))
      : 7; // Default for other languages
    
    const visualScore = avgVisualLength > 100 ? 7 : avgVisualLength > 50 ? 5 : 3;
    const visualDetailScore = (visualHasCamera ? 3 : 0) + (visualHasLighting ? 3 : 0) + 2;
    
    const overallScore = Math.round(
      (hookScore * 0.20) + 
      (foreshadowScore * 0.15) + 
      (bodyScore * 0.20) + 
      (ctaScore * 0.10) + 
      (slangScore * 0.15) + 
      ((visualScore + visualDetailScore) / 2 * 0.20)
    ) * 10;

    return {
      overall_score: Math.min(100, overallScore),
      criteria: [
        {
          name: "Hook Quality",
          score: hookScore,
          max_score: 10,
          gap_details: hasHook 
            ? `Hook present. ${hookHasQuestion ? '✓ Has question' : '✗ No question'}. ${hookHasTrigger ? '✓ Has trigger word' : '✗ Missing trigger (gila/shocking/rahasia)'}.`
            : "Missing HOOK segment entirely!",
          status: hookScore >= 7 ? "pass" : hookScore >= 5 ? "warning" : "fail"
        },
        {
          name: "Foreshadow/Retention Lock",
          score: foreshadowScore,
          max_score: 10,
          gap_details: hasForeshadow 
            ? foreshadowHasLock 
              ? "Good retention lock pattern detected." 
              : "Foreshadow exists but missing 'sampai habis/terakhir' lock pattern."
            : "Missing FORESHADOW segment - critical for retention!",
          status: foreshadowScore >= 7 ? "pass" : foreshadowScore >= 5 ? "warning" : "fail"
        },
        {
          name: "Body Structure",
          score: bodyScore,
          max_score: 10,
          gap_details: `${segments.filter(s => s.segment_type?.toUpperCase().includes('BODY')).length} body segments. Should have 2-4 for good pacing.`,
          status: bodyScore >= 7 ? "pass" : bodyScore >= 5 ? "warning" : "fail"
        },
        {
          name: "CTA Quality",
          score: ctaScore,
          max_score: 10,
          gap_details: hasCta 
            ? ctaHasAction 
              ? "CTA with action verb detected." 
              : "CTA present but missing action verb (follow/share/like)."
            : "Missing CTA segment!",
          status: ctaScore >= 7 ? "pass" : ctaScore >= 5 ? "warning" : "fail"
        },
        {
          name: "Slang Compliance",
          score: slangScore,
          max_score: 10,
          gap_details: language === 'indonesian'
            ? `gue: ${hasGue}x, lo: ${hasLo}x, particles: ${hasParticles}x. ${hasSaya > 0 || hasKamu > 0 ? '⚠️ Found saya/kamu - should use gue/lo' : '✓ No saya/kamu'}`
            : `Language: ${language} - slang validation enabled.`,
          status: slangScore >= 7 ? "pass" : slangScore >= 5 ? "warning" : "fail"
        },
        {
          name: "Visual Direction",
          score: Math.round((visualScore + visualDetailScore) / 2),
          max_score: 10,
          gap_details: `Avg length: ${Math.round(avgVisualLength)} chars. ${visualHasCamera ? '✓ Camera specs' : '✗ No camera'}. ${visualHasLighting ? '✓ Lighting' : '✗ No lighting'}.`,
          status: (visualScore + visualDetailScore) / 2 >= 7 ? "pass" : (visualScore + visualDetailScore) / 2 >= 5 ? "warning" : "fail"
        },
      ],
      recommendations: [
        ...(hookScore < 7 ? ["Add psychological trigger to hook (curiosity gap, controversy, or FOMO)"] : []),
        ...(foreshadowScore < 7 ? ["Include numbered tease: '...dan yang terakhir paling gila. Tonton sampai habis!'"] : []),
        ...(slangScore < 7 && language === 'indonesian' ? ["Replace saya/kamu with gue/lo. Add particles (sih, tuh, gitu)."] : []),
        ...(visualScore < 7 ? ["Enhance visual_direction with camera specs (CU/MCU/MS, lens, angle)"] : []),
        ...(ctaScore < 7 ? ["Make CTA more specific with engagement verb"] : []),
      ],
      summary: overallScore >= 80 
        ? "Script has solid viral structure. Ready for image prompt testing."
        : overallScore >= 60
        ? "Script has decent foundation but needs polish in hook/retention mechanics."
        : "Script missing critical viral elements. Major improvements needed in viralScriptKnowledge.ts."
    };
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-amber-500";
    return "text-red-500";
  };

  const getStatusIcon = (status: "pass" | "warning" | "fail") => {
    switch (status) {
      case "pass":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case "fail":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const formatSparkfluenceOutput = () => {
    if (!sparkfluenceOutput) return "";
    
    let output = `# ${sparkfluenceOutput.title}\n\n`;
    output += `**Language:** ${sparkfluenceOutput.language}\n`;
    output += `**Total Duration:** ${sparkfluenceOutput.total_duration}s\n\n`;
    output += `---\n\n`;
    
    sparkfluenceOutput.segments.forEach((seg) => {
      output += `### ${seg.segment_type} (${seg.start_time}s - ${seg.end_time}s)\n\n`;
      output += `**Script:**\n"${seg.script_text}"\n\n`;
      output += `**Visual Direction:**\n${seg.visual_direction}\n\n`;
      if (seg.emotional_label) {
        output += `**Emotion:** ${seg.emotional_label}\n`;
      }
      if (seg.scene_transition) {
        output += `**Transition:** ${seg.scene_transition}\n`;
      }
      output += `---\n\n`;
    });
    
    return output;
  };

  return (
    <div className="space-y-6">
      {/* Input Parameters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Input Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Topic */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium mb-2">Topic / Prompt</label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., 5 cara mengamankan password dari hacker"
                className="w-full h-20 px-3 py-2 text-sm border border-input rounded-lg bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            
            {/* Language */}
            <div>
              <label className="block text-sm font-medium mb-2">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full h-10 px-3 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="indonesian">Indonesian</option>
                <option value="english">English</option>
                <option value="hindi">Hindi</option>
              </select>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium mb-2">Duration</label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full h-10 px-3 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="30">30 seconds</option>
                <option value="45">45 seconds</option>
                <option value="60">60 seconds</option>
                <option value="90">90 seconds</option>
              </select>
            </div>

            {/* Aspect Ratio */}
            <div>
              <label className="block text-sm font-medium mb-2">Aspect Ratio</label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="w-full h-10 px-3 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="9:16">9:16 (TikTok/Reels)</option>
                <option value="16:9">16:9 (YouTube)</option>
              </select>
            </div>

            {/* DNA Tone Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="dnaTone"
                checked={useDnaTone}
                onChange={(e) => setUseDnaTone(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <label htmlFor="dnaTone" className="text-sm">Use DNA Tone</label>
            </div>
          </div>

          {/* Generate Button */}
          <div className="mt-4 flex gap-2">
            <Button
              onClick={handleGenerate}
              disabled={generating || !topic.trim()}
              className="gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Script
                </>
              )}
            </Button>
            
            {sparkfluenceOutput && (
              <Button
                variant="outline"
                onClick={() => {
                  setSparkfluenceOutput(null);
                  setRawSparkfluenceJson("");
                  setGapAnalysis(null);
                }}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>

          {error && (
            <div className="mt-4 p-3 text-sm text-red-500 bg-red-500/10 rounded-lg">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Output Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sparkfluence Output */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-primary" />
                Sparkfluence Output
              </CardTitle>
              {sparkfluenceOutput && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyJson}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded bg-muted/50"
                  >
                    {copiedJson ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    Copy JSON
                  </button>
                  <button
                    onClick={() => setShowRawJson(!showRawJson)}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    {showRawJson ? "Formatted" : "Raw JSON"}
                    {showRawJson ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[500px] overflow-auto">
              {generating ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : sparkfluenceOutput ? (
                <pre className="text-xs font-mono whitespace-pre-wrap bg-muted/50 p-4 rounded-lg">
                  {showRawJson ? rawSparkfluenceJson : formatSparkfluenceOutput()}
                </pre>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Click "Generate Script" to see output
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Claude Reference */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-amber-500" />
              Claude Reference
            </CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              value={claudeReference}
              onChange={(e) => setClaudeReference(e.target.value)}
              placeholder="Paste Claude's script output here for comparison...

Example format:
*HOOK* *ID:HOOK-001*
⏱️ 0—3s
🎥 **VISUAL**: Close-up, shocked expression...
🎙️ &quot;Lo tau nggak kenapa 90% orang...&quot;
😲 emotional_label: Curiosity
🎬 scene_transition: Cut"
              className="w-full h-[500px] px-4 py-3 text-xs font-mono border border-input rounded-lg bg-muted/50 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </CardContent>
        </Card>
      </div>

      {/* Analyze Gap Button */}
      {sparkfluenceOutput && claudeReference.trim() && (
        <div className="flex justify-center">
          <Button
            onClick={handleAnalyzeGap}
            disabled={analyzing}
            size="lg"
            className="gap-2"
          >
            {analyzing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Analyzing Gap...
              </>
            ) : (
              <>
                <BarChart3 className="h-5 w-5" />
                Analyze Gap & Score
              </>
            )}
          </Button>
        </div>
      )}

      {/* Gap Analysis Results */}
      {gapAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Gap Analysis Results</span>
              <span className={`text-3xl font-bold ${getScoreColor(gapAnalysis.overall_score)}`}>
                {gapAnalysis.overall_score}/100
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Progress Bar */}
            <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  gapAnalysis.overall_score >= 80
                    ? "bg-green-500"
                    : gapAnalysis.overall_score >= 60
                    ? "bg-amber-500"
                    : "bg-red-500"
                }`}
                style={{ width: `${gapAnalysis.overall_score}%` }}
              />
            </div>

            {/* Criteria Table */}
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Criteria</th>
                    <th className="text-center p-3 font-medium w-24">Score</th>
                    <th className="text-left p-3 font-medium">Gap Details</th>
                  </tr>
                </thead>
                <tbody>
                  {gapAnalysis.criteria.map((item, idx) => (
                    <tr key={idx} className="border-t border-border">
                      <td className="p-3 flex items-center gap-2">
                        {getStatusIcon(item.status)}
                        {item.name}
                      </td>
                      <td className="text-center p-3">
                        <span className={getScoreColor((item.score / item.max_score) * 100)}>
                          {item.score}/{item.max_score}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground">{item.gap_details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">Summary</h4>
              <p className="text-sm text-muted-foreground">{gapAnalysis.summary}</p>
            </div>

            {/* Recommendations */}
            {gapAnalysis.recommendations.length > 0 && (
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  💡 Recommendations for Improvement
                </h4>
                <ol className="space-y-2">
                  {gapAnalysis.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex gap-3 text-sm">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                        {idx + 1}
                      </span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Next Step */}
            {gapAnalysis.overall_score >= 70 && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-sm text-green-600 font-medium">
                  ✓ Script quality acceptable. Copy the JSON and test in Image Prompt tab.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
