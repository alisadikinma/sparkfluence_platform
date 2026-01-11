import React, { useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../contexts/AuthContext";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { 
  Loader2, 
  RefreshCw, 
  BarChart3, 
  CheckCircle2, 
  AlertCircle,
  Video,
  Copy,
  Check
} from "lucide-react";

interface VideoPromptResult {
  segment_number: number;
  segment_type: string;
  shot_type: string;
  duration: number;
  platform: string;
  video_prompt: string;
  audio_directive: string;
  dialogue_validation?: {
    valid: boolean;
    word_count: number;
    max_words: number;
  };
  camera_motion?: string;
  transition?: string;
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

export const VideoPromptTab: React.FC = () => {
  const { user } = useAuth();
  
  // Form state
  const [scriptSegmentsJson, setScriptSegmentsJson] = useState("");
  const [imagePromptsJson, setImagePromptsJson] = useState("");
  const [voiceGender, setVoiceGender] = useState("male");
  const [voiceLanguage, setVoiceLanguage] = useState("indonesian");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  
  // Output state
  const [sparkfluenceOutput, setSparkfluenceOutput] = useState<VideoPromptResult[]>([]);
  const [claudeReference, setClaudeReference] = useState("");
  
  // Loading/error state
  const [generating, setGenerating] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Analysis state
  const [gapAnalysis, setGapAnalysis] = useState<GapAnalysisResult | null>(null);
  
  // Copy state
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handleGenerate = async () => {
    if (!scriptSegmentsJson.trim()) {
      setError("Please enter script segments JSON");
      return;
    }

    setGenerating(true);
    setError(null);
    setGapAnalysis(null);

    try {
      // Parse script segments
      let segments;
      try {
        const parsed = JSON.parse(scriptSegmentsJson);
        segments = Array.isArray(parsed) ? parsed : parsed.segments;
      } catch {
        throw new Error("Invalid JSON format for script segments");
      }

      // Parse image prompts if provided
      let imageUrls: Record<number, string> = {};
      if (imagePromptsJson.trim()) {
        try {
          const imageParsed = JSON.parse(imagePromptsJson);
          const imageSegments = Array.isArray(imageParsed) ? imageParsed : imageParsed.segments;
          imageSegments?.forEach((seg: any) => {
            if (seg.segment_number && seg.image_url) {
              imageUrls[seg.segment_number] = seg.image_url;
            }
          });
        } catch {
          console.warn("Could not parse image prompts JSON, proceeding without");
        }
      }

      // Call generate-videos with mode: 'preview_prompts'
      // This returns prompts WITHOUT executing video generation
      const { data, error: fnError } = await supabase.functions.invoke('generate-videos', {
        body: {
          mode: 'preview_prompts',  // <-- Key: use preview mode
          segments: segments.map((seg: any, idx: number) => ({
            ...seg,
            segment_number: seg.segment_number || idx + 1,
            image_url: imageUrls[seg.segment_number || idx + 1] || seg.image_url || null,
          })),
          aspect_ratio: aspectRatio,
          voice_gender: voiceGender,
          voice_language: voiceLanguage,
          platform: 'auto',  // Auto-select VEO vs Sora based on duration
        }
      });

      if (fnError) throw fnError;
      
      if (data?.success && data?.data?.segments) {
        setSparkfluenceOutput(data.data.segments);
      } else {
        throw new Error(data?.error?.message || "Failed to generate video prompts");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setGenerating(false);
    }
  };

  const handleAnalyzeGap = async () => {
    if (sparkfluenceOutput.length === 0 || !claudeReference.trim()) {
      setError("Both Sparkfluence output and Claude reference are required for analysis");
      return;
    }

    setAnalyzing(true);
    setError(null);

    // Mock analysis - will be replaced with real LLM analysis
    await new Promise(resolve => setTimeout(resolve, 1000));
    setGapAnalysis(generateMockAnalysis());
    setAnalyzing(false);
  };

  const generateMockAnalysis = (): GapAnalysisResult => {
    // Analyze based on actual output
    const hasVeoTerms = sparkfluenceOutput.some(s => 
      s.video_prompt?.toLowerCase().match(/(dolly|push-in|pull-back|orbit|tracking|pan)/i)
    );
    const hasAudioDirective = sparkfluenceOutput.every(s => s.audio_directive?.length > 20);
    const hasDialogueValidation = sparkfluenceOutput.some(s => s.dialogue_validation);
    const allDialogueValid = sparkfluenceOutput.every(s => 
      !s.dialogue_validation || s.dialogue_validation.valid
    );
    const hasCameraMotion = sparkfluenceOutput.some(s => s.camera_motion);
    const hasTransitions = sparkfluenceOutput.some(s => s.transition);
    const avgPromptLength = sparkfluenceOutput.reduce((sum, s) => 
      sum + (s.video_prompt?.length || 0), 0) / sparkfluenceOutput.length;

    // Calculate scores
    const platformScore = sparkfluenceOutput.every(s => s.platform) ? 9 : 5;
    const durationScore = sparkfluenceOutput.every(s => s.duration > 0 && s.duration <= 8) ? 9 : 6;
    const cameraScore = hasVeoTerms ? 8 : hasCameraMotion ? 6 : 3;
    const subjectMotionScore = avgPromptLength > 200 ? 7 : avgPromptLength > 100 ? 5 : 3;
    const ambientScore = sparkfluenceOutput.some(s => 
      s.video_prompt?.toLowerCase().match(/(particle|dust|haze|floating|ambient)/i)
    ) ? 7 : 4;
    const audioScore = hasAudioDirective ? 8 : 3;
    const dialogueScore = hasDialogueValidation ? (allDialogueValid ? 9 : 6) : 4;
    const transitionScore = hasTransitions ? 8 : 5;

    const overallScore = Math.round(
      (platformScore + durationScore + cameraScore + subjectMotionScore + 
       ambientScore + audioScore + dialogueScore + transitionScore) / 8 * 10
    );

    return {
      overall_score: overallScore,
      criteria: [
        {
          name: "Platform Selection",
          score: platformScore,
          max_score: 10,
          gap_details: sparkfluenceOutput.every(s => s.platform) 
            ? `Platforms assigned: ${[...new Set(sparkfluenceOutput.map(s => s.platform))].join(', ')}`
            : "Missing platform selection for some segments",
          status: platformScore >= 7 ? "pass" : platformScore >= 5 ? "warning" : "fail"
        },
        {
          name: "Duration Accuracy",
          score: durationScore,
          max_score: 10,
          gap_details: `Durations: ${sparkfluenceOutput.map(s => s.duration + 's').join(', ')}. VEO max: 8s.`,
          status: durationScore >= 7 ? "pass" : durationScore >= 5 ? "warning" : "fail"
        },
        {
          name: "Camera Motion (VEO-verified)",
          score: cameraScore,
          max_score: 10,
          gap_details: hasVeoTerms 
            ? "VEO-verified camera terms detected (dolly/push-in/orbit)."
            : "Missing VEO-verified camera motion terms. Use: dolly push-in, gentle pull-back, slow orbit.",
          status: cameraScore >= 7 ? "pass" : cameraScore >= 5 ? "warning" : "fail"
        },
        {
          name: "Subject Motion",
          score: subjectMotionScore,
          max_score: 10,
          gap_details: `Avg prompt: ${Math.round(avgPromptLength)} chars. Should include micro-movements: blinks, breathing, gestures.`,
          status: subjectMotionScore >= 7 ? "pass" : subjectMotionScore >= 5 ? "warning" : "fail"
        },
        {
          name: "Ambient Motion",
          score: ambientScore,
          max_score: 10,
          gap_details: ambientScore >= 7 
            ? "Ambient motion specified (particles, haze, etc.)."
            : "Add ambient: 'floating dust particles', 'volumetric rays shifting'.",
          status: ambientScore >= 7 ? "pass" : ambientScore >= 5 ? "warning" : "fail"
        },
        {
          name: "Audio Directive",
          score: audioScore,
          max_score: 10,
          gap_details: hasAudioDirective 
            ? "Audio directives present for all segments."
            : "Missing or incomplete audio directives. Include: ambient, dialogue, exclude instructions.",
          status: audioScore >= 7 ? "pass" : audioScore >= 5 ? "warning" : "fail"
        },
        {
          name: "Dialogue Word Count",
          score: dialogueScore,
          max_score: 10,
          gap_details: hasDialogueValidation 
            ? (allDialogueValid ? "All dialogues within word limits." : "Some dialogues exceed word limits!")
            : "Dialogue validation not performed.",
          status: dialogueScore >= 7 ? "pass" : dialogueScore >= 5 ? "warning" : "fail"
        },
        {
          name: "Transition Instructions",
          score: transitionScore,
          max_score: 10,
          gap_details: hasTransitions 
            ? "Transitions specified."
            : "Add transition: 'End with slow dolly push-in', 'Hold final frame'.",
          status: transitionScore >= 7 ? "pass" : transitionScore >= 5 ? "warning" : "fail"
        },
      ],
      recommendations: [
        ...(cameraScore < 7 ? ["Use VEO-verified camera terms: 'smooth dolly push-in', 'gentle pull-back', 'slow orbit circling subject'"] : []),
        ...(subjectMotionScore < 7 ? ["Add micro-movements: 'subtle eye blinks every 2-3s', 'relaxed breathing motion', 'gentle head tilt'"] : []),
        ...(ambientScore < 7 ? ["Add ambient motion: 'floating dust particles drifting', 'volumetric rays shifting subtly'"] : []),
        ...(audioScore < 7 ? ["Include complete audio directive: Ambient + Dialogue + 'no subtitles, no audience sounds'"] : []),
        ...(dialogueScore < 7 ? ["Validate word count per duration: 8s max = 14 words (Indonesian), 7 words for 4s"] : []),
        ...(transitionScore < 7 ? ["Add transition ending: 'End on close-up hold', 'Gentle hold or fade-ready'"] : []),
      ],
      summary: overallScore >= 80 
        ? "Video prompts are well-structured. Ready for production testing with VEO/Sora."
        : overallScore >= 60
        ? "Video prompts have decent structure but missing some VEO-specific optimizations."
        : "Video prompts need major improvements. Focus on camera motion, audio directives, and word limits."
    };
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
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

  return (
    <div className="space-y-6">
      {/* Input Parameters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Input Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Script Segments JSON */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Script Segments JSON
                <span className="text-muted-foreground ml-2 font-normal">(from Script Gen tab)</span>
              </label>
              <textarea
                value={scriptSegmentsJson}
                onChange={(e) => setScriptSegmentsJson(e.target.value)}
                placeholder='{"segments": [{"segment_type": "HOOK", "script_text": "...", "duration": 5, ...}]}'
                className="w-full h-28 px-3 py-2 text-xs font-mono border border-input rounded-lg bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Image URLs JSON (optional) */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Image URLs JSON
                <span className="text-muted-foreground ml-2 font-normal">(optional - for I2V reference)</span>
              </label>
              <textarea
                value={imagePromptsJson}
                onChange={(e) => setImagePromptsJson(e.target.value)}
                placeholder='[{"segment_number": 1, "image_url": "https://..."}]'
                className="w-full h-28 px-3 py-2 text-xs font-mono border border-input rounded-lg bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Additional Settings */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-2">Voice Gender</label>
              <select
                value={voiceGender}
                onChange={(e) => setVoiceGender(e.target.value)}
                className="w-full h-10 px-3 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Voice Language</label>
              <select
                value={voiceLanguage}
                onChange={(e) => setVoiceLanguage(e.target.value)}
                className="w-full h-10 px-3 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="indonesian">Indonesian</option>
                <option value="english">English</option>
                <option value="hindi">Hindi</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Aspect Ratio</label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="w-full h-10 px-3 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="9:16">9:16 (Portrait)</option>
                <option value="16:9">16:9 (Landscape)</option>
              </select>
            </div>
          </div>

          {/* Generate Button */}
          <div className="mt-4 flex gap-2">
            <Button
              onClick={handleGenerate}
              disabled={generating || !scriptSegmentsJson.trim()}
              className="gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Video className="h-4 w-4" />
                  Generate Video Prompts (Preview Mode)
                </>
              )}
            </Button>
            
            {sparkfluenceOutput.length > 0 && (
              <Button
                variant="outline"
                onClick={() => {
                  setSparkfluenceOutput([]);
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
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-primary" />
              Sparkfluence Output
              {sparkfluenceOutput.length > 0 && (
                <span className="text-xs text-muted-foreground font-normal">
                  ({sparkfluenceOutput.length} segments)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[600px] overflow-auto space-y-4">
              {generating ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : sparkfluenceOutput.length > 0 ? (
                sparkfluenceOutput.map((segment, idx) => (
                  <div key={idx} className="p-4 bg-muted/50 rounded-lg space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 text-xs font-medium bg-primary/20 text-primary rounded">
                          {segment.segment_type}
                        </span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                          segment.platform === "veo-3.1-fast" 
                            ? "bg-green-500/20 text-green-600" 
                            : "bg-blue-500/20 text-blue-600"
                        }`}>
                          {segment.platform || 'VEO'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {segment.duration}s
                        </span>
                      </div>
                      <button
                        onClick={() => handleCopy(segment.video_prompt + '\n\nAUDIO:\n' + segment.audio_directive, idx)}
                        className="p-1 hover:bg-muted rounded"
                      >
                        {copiedIdx === idx ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                    </div>

                    {/* Dialogue Validation */}
                    {segment.dialogue_validation && (
                      <div className={`p-2 rounded text-xs ${
                        segment.dialogue_validation.valid 
                          ? "bg-green-500/10 text-green-600" 
                          : "bg-red-500/10 text-red-600"
                      }`}>
                        <strong>Dialogue:</strong> {segment.dialogue_validation.word_count}/{segment.dialogue_validation.max_words} words
                        {segment.dialogue_validation.valid ? " ✓" : " ⚠️ EXCEEDS LIMIT"}
                      </div>
                    )}
                    
                    {/* Video Prompt */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Video Prompt ({segment.video_prompt?.length || 0} chars):
                      </p>
                      <pre className="text-xs whitespace-pre-wrap bg-background/50 p-2 rounded max-h-40 overflow-auto">
                        {segment.video_prompt}
                      </pre>
                    </div>

                    {/* Audio Directive */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Audio Directive:</p>
                      <pre className="text-xs whitespace-pre-wrap bg-amber-500/10 p-2 rounded max-h-24 overflow-auto">
                        {segment.audio_directive}
                      </pre>
                    </div>

                    {/* Camera & Transition */}
                    {(segment.camera_motion || segment.transition) && (
                      <div className="flex gap-4 text-xs text-muted-foreground border-t border-border pt-2">
                        {segment.camera_motion && (
                          <span><strong>Camera:</strong> {segment.camera_motion}</span>
                        )}
                        {segment.transition && (
                          <span><strong>Transition:</strong> {segment.transition}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Click "Generate Video Prompts" to see output
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
              placeholder="Paste Claude's video prompts here for comparison...

Example format:
[VEO 3.1 — VIDEO — SHOT 1]
Duration: ~5s, 1080p, 9:16

CAMERA MOTION
Movement: Medium-speed dolly push-in
Speed: medium

SUBJECT MOTION
Direct eye contact, expression shifts from neutral to intrigue
Subtle eye blinks every 2-3s

AUDIO
Ambient: Quiet home office...
Dialogue: [Creator] says: '...'
Exclude: no subtitles..."
              className="w-full h-[600px] px-4 py-3 text-xs font-mono border border-input rounded-lg bg-muted/50 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </CardContent>
        </Card>
      </div>

      {/* Analyze Gap Button */}
      {sparkfluenceOutput.length > 0 && claudeReference.trim() && (
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
          </CardContent>
        </Card>
      )}
    </div>
  );
};
