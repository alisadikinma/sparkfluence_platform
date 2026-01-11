import React, { useState } from "react";
import { supabase } from "../../../lib/supabase";
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
  Check,
  FileText,
  Wand2
} from "lucide-react";

interface ParsedSegment {
  segment_number: number;
  segment_type: string;
  shot_type: "CREATOR" | "B-ROLL";
  script_text: string;
  image_prompt: string;
  negative_prompt?: string;
}

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

// Parser for Image Prompt output format
function parseImagePromptsOutput(input: string): ParsedSegment[] {
  const segments: ParsedSegment[] = [];
  
  // Split by segment markers
  const segmentBlocks = input.split(/={3,}\s*\n/).filter(block => block.trim());
  
  let segmentNumber = 0;
  
  for (const block of segmentBlocks) {
    // Match segment header: === SEGMENT 1: HOOK (CREATOR) ===
    const headerMatch = block.match(/SEGMENT\s*(\d+):\s*(\w+(?:-\d+)?)\s*\((\w+(?:-\w+)?)\)/i);
    
    if (headerMatch) {
      segmentNumber = parseInt(headerMatch[1]) || segmentNumber + 1;
      const segmentType = headerMatch[2].toUpperCase();
      const shotType = headerMatch[3].toUpperCase().includes("CREATOR") ? "CREATOR" : "B-ROLL";
      
      // Extract script text
      const scriptMatch = block.match(/Script:\s*"([^"]+)"/i);
      const scriptText = scriptMatch ? scriptMatch[1] : "";
      
      // Extract image prompt (everything between --- IMAGE PROMPT --- and --- NEGATIVE PROMPT --- or end)
      const imagePromptMatch = block.match(/---\s*IMAGE PROMPT[^-]*---\s*([\s\S]*?)(?=---\s*NEGATIVE|$)/i);
      let imagePrompt = imagePromptMatch ? imagePromptMatch[1].trim() : "";
      
      // Extract negative prompt if exists
      const negativeMatch = block.match(/---\s*NEGATIVE PROMPT\s*---\s*([\s\S]*?)(?=={3,}|$)/i);
      const negativePrompt = negativeMatch ? negativeMatch[1].trim() : undefined;
      
      segments.push({
        segment_number: segmentNumber,
        segment_type: segmentType,
        shot_type: shotType,
        script_text: scriptText,
        image_prompt: imagePrompt,
        negative_prompt: negativePrompt
      });
    }
  }
  
  return segments;
}

// Calculate duration based on script text (Indonesian: ~2 words/sec)
function estimateDuration(scriptText: string, segmentType: string): number {
  const wordCount = scriptText.split(/\s+/).filter(w => w.length > 0).length;
  
  // Base duration from word count (Indonesian ~2 words/sec, buffer 1.2x)
  let duration = Math.ceil(wordCount / 2 * 1.2);
  
  // Clamp based on segment type
  if (segmentType.includes("HOOK") || segmentType.includes("CTA")) {
    duration = Math.max(4, Math.min(6, duration));
  } else if (segmentType.includes("FORE")) {
    duration = Math.max(4, Math.min(6, duration));
  } else {
    duration = Math.max(5, Math.min(8, duration));
  }
  
  return duration;
}

// Extract AUDIO section from full prompt
function extractAudioFromPrompt(prompt: string): string {
  // Look for AUDIO: section or similar patterns
  const audioMatch = prompt.match(/(?:AUDIO[:\s]*|AUDIO DIRECTIVE[:\s]*)([\s\S]*?)(?=\n\n[A-Z]|\nCONTINUITY|\nTRANSITION|\nOUTPUT|\nEXCLUSIONS|\nNEGATIVE|$)/i);
  if (audioMatch) {
    return audioMatch[1].trim();
  }
  
  // Fallback: look for Ambient/Dialogue patterns
  const ambientMatch = prompt.match(/Ambient:[\s\S]*?(?:Exclude:[^\n]*)?/i);
  if (ambientMatch) {
    return ambientMatch[0].trim();
  }
  
  return "No audio directive found";
}

// Extract CAMERA section from prompt
function extractCameraFromPrompt(prompt: string): string | undefined {
  const match = prompt.match(/CAMERA[:\s]*\n?([^\n]+)/i);
  return match ? match[1].trim() : undefined;
}

// Extract TRANSITION from prompt
function extractTransitionFromPrompt(prompt: string): string | undefined {
  const match = prompt.match(/TRANSITION[:\s]*\n?([^\n]+)/i);
  return match ? match[1].trim() : undefined;
}

export const VideoPromptTab: React.FC = () => {
  // Form state - simplified
  const [imagePromptsOutput, setImagePromptsOutput] = useState("");
  const [voiceGender, setVoiceGender] = useState("male");
  const [voiceLanguage, setVoiceLanguage] = useState("indonesian");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  
  // Parsed segments
  const [parsedSegments, setParsedSegments] = useState<ParsedSegment[]>([]);
  
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

  // Parse input when it changes
  const handleInputChange = (value: string) => {
    setImagePromptsOutput(value);
    setError(null);
    
    if (value.trim()) {
      const parsed = parseImagePromptsOutput(value);
      setParsedSegments(parsed);
      
      if (parsed.length === 0 && value.length > 50) {
        setError("Could not parse segments. Make sure format matches Image Prompt output.");
      }
    } else {
      setParsedSegments([]);
    }
  };

  const handleGenerate = async () => {
    if (parsedSegments.length === 0) {
      setError("No segments parsed. Paste the Image Prompt output first.");
      return;
    }

    setGenerating(true);
    setError(null);
    setGapAnalysis(null);

    try {
      // Convert parsed segments to format expected by generate-videos
      const segments = parsedSegments.map(seg => ({
        segment_number: seg.segment_number,
        segment_type: seg.segment_type,
        shot_type: seg.shot_type,
        script_text: seg.script_text,
        duration_seconds: estimateDuration(seg.script_text, seg.segment_type),
        // image_url would come from actual generation, not preview
      }));

      // Call generate-videos with mode: 'preview_prompts'
      const { data, error: fnError } = await supabase.functions.invoke('generate-videos', {
        body: {
          mode: 'preview_prompts',
          segments,
          language: voiceLanguage,
          aspect_ratio: aspectRatio,
          preferred_platform: 'auto',
          creator_gender: voiceGender,
        }
      });

      if (fnError) throw fnError;
      
      // API returns `prompts` array with different field names
      if (data?.success && data?.data?.prompts) {
        // Map API response to our VideoPromptResult format
        const mappedResults: VideoPromptResult[] = data.data.prompts.map((p: any) => ({
          segment_number: p.segment_number,
          segment_type: p.segment_type,
          shot_type: p.shot_type,
          duration: p.duration,
          platform: p.platform_name || p.platform,
          video_prompt: p.prompt,  // API returns 'prompt', we use 'video_prompt'
          audio_directive: extractAudioFromPrompt(p.prompt), // Extract AUDIO section
          dialogue_validation: p.dialogue_validation,
          camera_motion: extractCameraFromPrompt(p.prompt),
          transition: extractTransitionFromPrompt(p.prompt),
        }));
        setSparkfluenceOutput(mappedResults);
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

    await new Promise(resolve => setTimeout(resolve, 1000));
    setGapAnalysis(generateMockAnalysis());
    setAnalyzing(false);
  };

  const generateMockAnalysis = (): GapAnalysisResult => {
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
            ? `Platforms: ${[...new Set(sparkfluenceOutput.map(s => s.platform))].join(', ')}`
            : "Missing platform selection",
          status: platformScore >= 7 ? "pass" : platformScore >= 5 ? "warning" : "fail"
        },
        {
          name: "Duration Accuracy",
          score: durationScore,
          max_score: 10,
          gap_details: `Durations: ${sparkfluenceOutput.map(s => s.duration + 's').join(', ')}`,
          status: durationScore >= 7 ? "pass" : durationScore >= 5 ? "warning" : "fail"
        },
        {
          name: "Camera Motion (VEO-verified)",
          score: cameraScore,
          max_score: 10,
          gap_details: hasVeoTerms 
            ? "VEO-verified terms detected"
            : "Missing VEO camera terms (dolly/push-in/orbit)",
          status: cameraScore >= 7 ? "pass" : cameraScore >= 5 ? "warning" : "fail"
        },
        {
          name: "Subject Motion",
          score: subjectMotionScore,
          max_score: 10,
          gap_details: `Avg prompt: ${Math.round(avgPromptLength)} chars`,
          status: subjectMotionScore >= 7 ? "pass" : subjectMotionScore >= 5 ? "warning" : "fail"
        },
        {
          name: "Ambient Motion",
          score: ambientScore,
          max_score: 10,
          gap_details: ambientScore >= 7 ? "Ambient motion specified" : "Add particles/haze",
          status: ambientScore >= 7 ? "pass" : ambientScore >= 5 ? "warning" : "fail"
        },
        {
          name: "Audio Directive",
          score: audioScore,
          max_score: 10,
          gap_details: hasAudioDirective ? "Audio directives present" : "Missing audio directives",
          status: audioScore >= 7 ? "pass" : audioScore >= 5 ? "warning" : "fail"
        },
        {
          name: "Dialogue Word Count",
          score: dialogueScore,
          max_score: 10,
          gap_details: hasDialogueValidation 
            ? (allDialogueValid ? "All dialogues valid" : "Some exceed limits!")
            : "No validation",
          status: dialogueScore >= 7 ? "pass" : dialogueScore >= 5 ? "warning" : "fail"
        },
        {
          name: "Transition Instructions",
          score: transitionScore,
          max_score: 10,
          gap_details: hasTransitions ? "Transitions specified" : "Add transition instructions",
          status: transitionScore >= 7 ? "pass" : transitionScore >= 5 ? "warning" : "fail"
        },
      ],
      recommendations: [
        ...(cameraScore < 7 ? ["Use VEO-verified camera terms: 'smooth dolly push-in', 'slow orbit'"] : []),
        ...(subjectMotionScore < 7 ? ["Add micro-movements: 'subtle eye blinks', 'relaxed breathing'"] : []),
        ...(ambientScore < 7 ? ["Add ambient: 'floating dust particles', 'volumetric rays'"] : []),
        ...(audioScore < 7 ? ["Include audio directive: Ambient + Dialogue + 'no subtitles'"] : []),
        ...(dialogueScore < 7 ? ["Validate word count: 8s max = 14 words Indonesian"] : []),
        ...(transitionScore < 7 ? ["Add transition: 'End on close-up hold'"] : []),
      ],
      summary: overallScore >= 80 
        ? "Ready for production testing."
        : overallScore >= 60
        ? "Decent structure but needs VEO optimizations."
        : "Needs major improvements."
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
      case "pass": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "warning": return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case "fail": return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const handleCopyAll = () => {
    const allOutput = sparkfluenceOutput.map((seg, idx) => 
      `=== SEGMENT ${idx + 1}: ${seg.segment_type} ===\n` +
      `Platform: ${seg.platform}\n` +
      `Duration: ${seg.duration}s\n\n` +
      `--- VIDEO PROMPT ---\n${seg.video_prompt}\n\n` +
      `--- AUDIO DIRECTIVE ---\n${seg.audio_directive}`
    ).join('\n\n============================================================\n\n');
    
    navigator.clipboard.writeText(allOutput);
    setCopiedIdx(-1);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Input - Simplified */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Input: Image Prompts Output
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Single textarea for Image Prompt output */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Paste Image Prompts Output
              <span className="text-muted-foreground ml-2 font-normal">
                (from Image Prompt tab)
              </span>
            </label>
            <textarea
              value={imagePromptsOutput}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={`=== SEGMENT 1: HOOK (CREATOR) ===
Provider: fal-nano-banana
Script: "Lo tau nggak kenapa..."

--- IMAGE PROMPT ---
A photorealistic cinematic...

============================================================

=== SEGMENT 2: FORE (B-ROLL) ===
...`}
              className="w-full h-48 px-3 py-2 text-xs font-mono border border-input rounded-lg bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
            
            {/* Parse status */}
            {parsedSegments.length > 0 && (
              <div className="mt-2 p-2 bg-green-500/10 text-green-600 rounded text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Parsed {parsedSegments.length} segments: {parsedSegments.map(s => s.segment_type).join(', ')}
              </div>
            )}
          </div>

          {/* Settings Row */}
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[120px]">
              <label className="block text-xs font-medium mb-1 text-muted-foreground">Voice Gender</label>
              <select
                value={voiceGender}
                onChange={(e) => setVoiceGender(e.target.value)}
                className="w-full h-9 px-3 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <div className="flex-1 min-w-[120px]">
              <label className="block text-xs font-medium mb-1 text-muted-foreground">Language</label>
              <select
                value={voiceLanguage}
                onChange={(e) => setVoiceLanguage(e.target.value)}
                className="w-full h-9 px-3 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="indonesian">Indonesian</option>
                <option value="english">English</option>
                <option value="hindi">Hindi</option>
              </select>
            </div>

            <div className="flex-1 min-w-[120px]">
              <label className="block text-xs font-medium mb-1 text-muted-foreground">Aspect Ratio</label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="w-full h-9 px-3 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="9:16">9:16 (Portrait)</option>
                <option value="16:9">16:9 (Landscape)</option>
              </select>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={generating || parsedSegments.length === 0}
              className="gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Generate Video Prompts
                </>
              )}
            </Button>
          </div>

          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-500/10 rounded-lg">
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
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-primary" />
                Sparkfluence Output
                {sparkfluenceOutput.length > 0 && (
                  <span className="text-xs text-muted-foreground font-normal">
                    ({sparkfluenceOutput.length} segments)
                  </span>
                )}
              </div>
              {sparkfluenceOutput.length > 0 && (
                <Button variant="ghost" size="sm" onClick={handleCopyAll} className="gap-1">
                  {copiedIdx === -1 ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  Copy All
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[500px] overflow-auto space-y-4">
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
                          segment.platform?.toLowerCase().includes("veo") 
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
                        {segment.dialogue_validation.valid ? " ✓" : " ⚠️ EXCEEDS"}
                      </div>
                    )}
                    
                    {/* Video Prompt */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Video Prompt:
                      </p>
                      <pre className="text-xs whitespace-pre-wrap bg-background/50 p-2 rounded max-h-32 overflow-auto">
                        {segment.video_prompt}
                      </pre>
                    </div>

                    {/* Audio Directive */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Audio:</p>
                      <pre className="text-xs whitespace-pre-wrap bg-amber-500/10 p-2 rounded max-h-20 overflow-auto">
                        {segment.audio_directive}
                      </pre>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                  <Video className="h-8 w-8 opacity-50" />
                  <span>Paste Image Prompts output and click Generate</span>
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
              placeholder="Paste Claude's video prompts for comparison...

[VEO 3.1 — VIDEO — SHOT 1]
Duration: ~5s, 1080p, 9:16

CAMERA MOTION
Movement: Medium-speed dolly push-in

SUBJECT MOTION
Direct eye contact, subtle blinks...

AUDIO
Ambient: Quiet home office...
Dialogue: [Creator] says: '...'
Exclude: no subtitles..."
              className="w-full h-[500px] px-4 py-3 text-xs font-mono border border-input rounded-lg bg-muted/50 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </CardContent>
        </Card>
      </div>

      {/* Analyze Gap */}
      {sparkfluenceOutput.length > 0 && claudeReference.trim() && (
        <div className="flex justify-center">
          <Button onClick={handleAnalyzeGap} disabled={analyzing} size="lg" className="gap-2">
            {analyzing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <BarChart3 className="h-5 w-5" />
                Analyze Gap
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
              <span>Gap Analysis</span>
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
                  gapAnalysis.overall_score >= 80 ? "bg-green-500"
                    : gapAnalysis.overall_score >= 60 ? "bg-amber-500" : "bg-red-500"
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
                    <th className="text-center p-3 font-medium w-20">Score</th>
                    <th className="text-left p-3 font-medium">Gap</th>
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
                      <td className="p-3 text-xs text-muted-foreground">{item.gap_details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Recommendations */}
            {gapAnalysis.recommendations.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">💡 Recommendations</h4>
                <ul className="space-y-1 text-sm">
                  {gapAnalysis.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="text-primary">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-sm text-muted-foreground">{gapAnalysis.summary}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
