# Sparkfluence v3.0 — bolt.new UI Specs

> **Tech stack: React 18 + TypeScript + Tailwind CSS + Lucide icons. Dark theme default.**
> **All components use mock data — no backend integration needed.**
> **Build ONLY the UI shells. Business logic will be wired during integration.**

---

## IMPORTANT: UI Implementation Rules

1. **Desktop-Optimized Productivity Tool:** Use `minmax` grid layouts. Prioritize desktop density and information clarity. Don't break on smaller screens, but desktop is primary.
2. **Glassmorphism Restraint:** Use `backdrop-blur` ONLY on sticky headers, floating overlays, and modals. Never on main content cards — preserve readability and performance.
3. **Vertical Verticality:** This is for TikTok/Shorts/Reels. ALL media placeholders MUST force a **9:16 portrait aspect ratio**. Never use landscape placeholders.
4. **Typographic Hierarchy:** The 'Spoken Script' is the hero content. It must be visually distinct from 'Visual Direction' cues — larger, brighter, and primary. Visual Direction is secondary (smaller, italic, muted accent).
5. **Organic Loading:** No boring spinners. Loading states use **pulsing gradient mesh** or 'breathing' emerald glow animations — the AI is *thinking creatively*, not just processing.
6. **Smooth Transitions:** When navigating from ChatHome to Workspace, the layout should not feel like a hard page switch. The topic input card should feel like it 'expands' into the Workspace shell.
7. **Empty State Excellence:** All empty states must have helpful illustrations or text — never show a blank white/dark void. Use warm gray placeholders with dashed borders and helpful hints.
8. **Retention Heatmap:** Every segment card has a subtle left-border glow that indicates retention strength at a glance. HOOK/PEAK = emerald glow, FORE/BODY = amber, LOOP-END = cool gray. This acts as "Grammarly for Retention."
9. **Director Chips, Not Text Blobs:** Visual Direction is displayed as structured chips/tags (`[Medium Shot]`, `[Screen Shake]`, `[B-Roll: Money]`), NOT a raw textarea paragraph. This transforms the user from "writer" to "director."
10. **Contextual AI Actions:** When a user focuses on a segment card for >2 seconds or highlights text, show a small floating action bar with context-aware options (Shorten, Make Punchier, Suggest B-Roll). Power at the cursor, not hidden in menus.
11. **Trinity Power View (Workspace):** The Workspace uses a **3-column command center**: Left Wing (context: trending velocity, style memory/brand kit) + Center (script workspace, full width on smaller screens) + Right Wing (9:16 Live Simulator, always active). This gives creators a "mission control" feel.
12. **One-Click Fix on Weak Segments:** Segments with low retention scores (amber/red heatmap border) get a visible `[✨ Fix]` button in their header. Clicking it triggers AI rewrite for that single segment. The button pulses gently to draw attention to weak spots.
13. **Semantic Highlighting:** As the user types keywords in the script (e.g., "uang", "ledakan", "AI"), the system auto-suggests relevant Director Chips below the text. Keywords that map to visual cues get a subtle underline highlight in the script text itself.
14. **Director Chips with Preview:** When hovering a Director Chip (e.g., `[🎥 Zoom-in]`, `[🎬 Jump Cut]`), show a **1-second micro-animation** tooltip that demonstrates the camera movement. This removes guesswork for non-filmmakers. Use CSS animation or a small looping GIF/SVG.
15. **Waveform Overlay:** Below each segment's script text, show a **mini waveform bar** representing estimated speech duration vs. segment duration. If the text is too long for the duration, the waveform turns red and overflows visually. This makes timing issues instantly visible.
16. **Visual Haptics (Typewriter Animation):** When AI generates or rewrites script text, the text should appear with a **typewriter rhythm** — character by character with natural cadence (40-60ms per char, with slight pauses at punctuation). Never dump a wall of text instantly.
17. **Pre-Flight Checklist:** Before the "Generate Video" step, show a compact readiness dashboard: `[Hook: ✅ Strong] [Pacing: ✅ Fast] [CTA: ✅ Included] [Images: ✅ 7/7] [Duration: 60s]`. This builds user confidence and catches missing elements.
18. **Command Palette (Ctrl+K / ⌘K):** A global quick-access modal for power users. Type `/hook` to jump to hook selector, `/compare` to trigger script comparison, `/generate` to start generation, or search any session/topic. Think Linear's command menu.
19. **Skeleton Video Preview (Zero-Wait):** While waiting for actual video generation, show a **Ken Burns animated storyboard** — the generated images with subtle pan/zoom + script text overlay + segment timing. User sees the video "coming to life" in 2 seconds, not after 5 minutes of waiting.

---

## Design Philosophy & Visual Identity

### The Problem with "AI Purple"
Most AI tools default to purple gradients + dark blue backgrounds. This screams "generic AI product." Sparkfluence must look like a **premium creative tool** — think Linear, Framer, Runway, or Stripe — not another ChatGPT clone.

### Design Inspirations

| Product | What to Steal | Why It Works |
|---------|--------------|--------------|
| **Linear** | LCH color system, extreme attention to spacing/alignment, "timeless" neutral tones, Inter font, subtle elevation via opacity | Feels like a precision instrument. No visual noise. |
| **Perplexity** | "Invisible branding" — minimal accent color, FK Grotesk font, information density without clutter, layered dark surfaces for depth | Focus on content, not chrome. Scandi subway system vibe. |
| **Framer** | Warm dark backgrounds, bold typography contrast, creative energy without chaos, glass-morphism done tastefully | Creative tool that feels alive but not cluttered. |
| **Stripe** | Data clarity, clean card layouts, subtle borders, excellent use of whitespace in dark mode | Makes complex data feel simple and approachable. |
| **Runway ML** | Creative dark UI, cinematic feel, strong visual hierarchy, content as hero | Video tool that makes the content shine, UI disappears. |
| **CapCut Web** | Timeline UI, sidebar organization, dark creative workspace, warm accents | Direct competitor reference for video editing workflow. |

### Color Palette — "Warm Charcoal + Emerald"

**REJECT** the typical AI palette (`purple-500`, `blue-500`, dark navy). Instead use:

```css
:root {
  /* ── Backgrounds (warm charcoal, NOT cold blue-black) ── */
  --bg-base:       #0B0E14;    /* Page background — deep obsidian, futuristik premium */
  --bg-surface:    #161616;    /* Cards, panels — subtle lift */
  --bg-elevated:   #1E1E1E;    /* Modals, dropdowns, popovers */
  --bg-hover:      #252525;    /* Hover states */
  --bg-active:     #2A2A2A;    /* Active/pressed states */

  /* ── Primary Accent — Emerald (fresh, creative, NOT AI-purple) ── */
  --accent:        #10B981;    /* emerald-500 — primary actions, links, active states */
  --accent-hover:  #059669;    /* emerald-600 — hover */
  --accent-subtle: #10B98115;  /* emerald with 8% opacity — subtle backgrounds */
  --accent-glow:   #10B98130;  /* emerald glow for focus rings */

  /* ── Secondary Accent — Warm Amber (energy, creativity) ── */
  --secondary:     #F59E0B;    /* amber-500 — badges, warnings, highlights */
  --secondary-subtle: #F59E0B15;

  /* ── Text (warm whites, NOT cold blue-white) ── */
  --text-primary:  #FAFAF9;    /* warm white — headings, primary text */
  --text-secondary:#A8A29E;    /* warm gray — descriptions, labels */
  --text-muted:    #78716C;    /* muted warm — timestamps, hints */
  --text-disabled: #57534E;    /* disabled state */

  /* ── Borders (subtle, warm) ── */
  --border:        #262626;    /* default border */
  --border-hover:  #404040;    /* hover border */
  --border-focus:  #10B981;    /* focus ring = accent */

  /* ── Status Colors ── */
  --success:       #22C55E;    /* green-500 */
  --warning:       #F59E0B;    /* amber-500 */
  --error:         #EF4444;    /* red-500 */
  --info:          #06B6D4;    /* cyan-500 */

  /* ── Session Type Colors (sidebar history) ── */
  --script-gen:    #F59E0B;    /* amber — script sessions */
  --creator-lab:   #10B981;    /* emerald — creator lab sessions */
  --ad-studio:     #8B5CF6;    /* violet — ad studio (ONLY place purple appears) */
  --completed:     #22C55E;    /* green — completed any type */
}
```

### Tailwind Config Mapping

```javascript
// tailwind.config.js — extend theme
colors: {
  bg: {
    base: '#0B0E14',
    surface: '#161616',
    elevated: '#1E1E1E',
    hover: '#252525',
    active: '#2A2A2A',
  },
  accent: {
    DEFAULT: '#10B981',
    hover: '#059669',
    subtle: 'rgba(16, 185, 129, 0.08)',
    glow: 'rgba(16, 185, 129, 0.19)',
  },
  warm: {
    DEFAULT: '#F59E0B',
    subtle: 'rgba(245, 158, 11, 0.08)',
  },
}
```

### Typography

| Element | Font | Size | Weight | Color |
|---------|------|------|--------|-------|
| Logo/Brand | Inter Display | 20px | 700 | `--text-primary` |
| Page title | Inter | 24px | 600 | `--text-primary` |
| Section header | Inter | 16px | 600 | `--text-primary` |
| Body text | Inter | 14px | 400 | `--text-secondary` |
| Small/label | Inter | 12px | 500 | `--text-muted` |
| Code/mono | JetBrains Mono | 13px | 400 | `--text-secondary` |

### Spacing & Border Radius

| Element | Border Radius | Padding |
|---------|---------------|---------|
| Cards/panels | 12px | 16px-20px |
| Buttons (primary) | 8px | 8px 16px |
| Buttons (small) | 6px | 4px 10px |
| Input fields | 8px | 10px 12px |
| Badges/pills | 9999px (full round) | 2px 8px |
| Modal | 16px | 24px |
| Sidebar items | 8px | 8px 12px |

### Elevation & Depth (Linear-style)

NO heavy shadows. Use subtle opacity shifts:

| Level | Technique | Example |
|-------|-----------|---------|
| Base | `bg-base` | Page background |
| Surface (+1) | `bg-surface` | Cards, sidebar |
| Elevated (+2) | `bg-elevated` + `border` (1px `--border`) | Modals, popovers |
| Floating (+3) | `bg-elevated` + `ring-1 ring-white/5` + subtle shadow | Dropdowns, tooltips |

```css
/* Only shadow for floating elements */
.shadow-float {
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4), 0 0 1px rgba(255, 255, 255, 0.05);
}
```

### Interaction States

| State | Visual |
|-------|--------|
| Hover | `bg-hover` + subtle border lighten |
| Focus | `ring-2 ring-accent-glow` (emerald glow) |
| Active/Pressed | `bg-active` + slight scale(0.98) |
| Disabled | 40% opacity, no pointer events |
| Loading | Skeleton shimmer (warm gray gradient) |

### Key Design Rules

1. **No purple gradients** — Emerald is the hero color. Purple only appears for Ad Studio session badges.
2. **Warm, not cold** — All grays have warm undertones (`stone` family, NOT `slate` or `gray`).
3. **Content is hero** — UI should disappear. Scripts, images, and videos take center stage.
4. **Depth via layers** — Use stacked surfaces (`bg-base` → `bg-surface` → `bg-elevated`), not shadows.
5. **Generous whitespace** — Don't cram. Let elements breathe. Minimum 12px gap between elements.
6. **Micro-interactions** — Subtle transitions (150ms ease), hover lifts, focus glows. Nothing dramatic.
7. **Consistent iconography** — All icons from Lucide, 20px default, `--text-muted` color, `--text-primary` on hover.
8. **Script vs Visual Direction hierarchy** — Spoken Script text is the hero: 15px, `--text-primary`, full brightness. Visual Direction is secondary: 13px, italic, `--text-muted`, with a subtle `bg-surface` pill/background to visually separate it. This mimics a real screenplay layout.
9. **9:16 everywhere** — All image/video placeholders, thumbnails, and media cards must use vertical portrait aspect ratio. Use `aspect-[9/16]` Tailwind class.
10. **Loading = creative energy** — Loading overlays use a pulsing emerald gradient mesh or breathing glow behind phase text. Skeletons use warm gray shimmer (`#1E1E1E` → `#2A2A2A` animation). Never a plain spinner.
11. **Retention Heatmap on segment cards** — Each segment card has a 4px left border that glows based on segment type: HOOK/PEAK = `--accent` (emerald), FORE/BODY = `--secondary` (amber), CTA = `--info` (cyan), LOOP-END = `--text-muted` (gray). This is subtle but immediate — like a linter gutter color.
12. **Director Chips for Visual Direction** — Visual Direction fields render as a row of styled chips, NOT a wall of text. Chips are categorized: `🎥 Camera` (blue), `🎬 Action` (amber), `✨ FX/VFX` (purple), `🔊 SFX` (green), `📝 Text Pop` (pink). Each chip has an icon prefix. Below the chips, a small "+ Add" button with a dropdown of common directions.
13. **Inline Diff over Side-by-Side** — Script comparison supports an "Inline Diff" view (default) in addition to side-by-side. Inline diff shows changes directly on the current cards: removed text in `text-red-500/50 line-through`, added text in `text-emerald-400 font-medium`. A floating `[Accept] [Reject]` bar follows the diff.

---

## Product Context

**Sparkfluence** is an AI-powered SaaS for generating viral video scripts (TikTok, Reels, Shorts). We're redesigning from a multi-page app into a Gemini/ChatGPT-style chat-based platform.

### Three Tools

| Tool | Purpose | Steps |
|------|---------|-------|
| **Script Gen** | Generate viral scripts only | Topic → Script review + Hooks + Compare + Virality score |
| **Creator Lab** | Full video pipeline | (New script OR pick existing) → Image → Video → Studio |
| **Ad Studio** | Video ads pipeline | (New ad script OR pick existing) → Image → Video → Studio |

### URL Structure
```
/                              → Home (greeting + quick actions)
/script-gen                    → Script Gen (new)
/script-gen/:orderId           → Script Gen (existing session)
/creator-lab                   → Creator Lab (new)
/creator-lab/:orderId          → Creator Lab (existing session)
/creator-lab/:orderId/images   → Creator Lab at Image step
/creator-lab/:orderId/video    → Creator Lab at Video step
/creator-lab/:orderId/studio   → Creator Lab at Studio step
/ad-studio                     → Ad Studio (new)
/ad-studio/:orderId            → Ad Studio (existing session)
/dashboard                     → Dashboard (separate page)
/planner                       → Planner (separate page)
/gallery                       → Gallery (separate page)
/settings/*                    → Settings (separate page)
```

---

## Layout Overview

```
┌─────────────────────────────────────────────────────────────┐
│ ┌──────────────┐ ┌────────────────────────────────────────┐ │
│ │   SIDEBAR    │ │           MAIN AREA                    │ │
│ │              │ │                                        │ │
│ │ ┌──────────┐ │ │  Home (default):                      │ │
│ │ │  MENU    │ │ │  ┌──────────────────────────────────┐  │ │
│ │ │ Dashboard│ │ │  │ "What's going viral today?"      │  │ │
│ │ │ Planner  │ │ │  │ [Trending + Topic input]         │  │ │
│ │ │ScriptGen │ │ │  └──────────────────────────────────┘  │ │
│ │ │CreatorLab│ │ │                                        │ │
│ │ │ AdStudio │ │ │  Script Gen workspace:                 │ │
│ │ │ Gallery  │ │ │  ┌──────────────────────────────────┐  │ │
│ │ └──────────┘ │ │  │ Topic input → Generate → Review  │  │ │
│ │              │ │  │ Segments + Hooks + Compare + Score│  │ │
│ │              │ │ │  └──────────────────────────────────┘  │ │
│ │ ┌──────────┐ │ │                                        │ │
│ │ │ HISTORY  │ │ │  Creator Lab workspace:                │ │
│ │ │ Today    │ │ │  ┌──────────────────────────────────┐  │ │
│ │ │  · SF-.. │ │ │  │ [New Script | Pick Existing]     │  │ │
│ │ │  · SF-.. │ │ │  │ Step: Image → Video → Studio     │  │ │
│ │ │ Yesterday│ │ │  └──────────────────────────────────┘  │ │
│ │ │  · SF-.. │ │ │                                        │ │
│ │ └──────────┘ │ │                                        │ │
│ └──────────────┘ └────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Components to Build (18 total + sub-components)

### 1. ChatLayout

```typescript
// Wrapper: Sidebar + Main area. Used as route layout.
interface ChatLayoutProps {
  children: React.ReactNode;
}

// Renders:
// - ChatSidebar on the left (collapsible: 72px / 260px)
// - Main content area (children) fills remaining space
// - No TopNavbar — theme/user controls move into sidebar header
```

---

### 2. ChatSidebar

```typescript
interface ChatSidebarProps {
  // Menu
  menuItems: MenuItem[];
  activeMenuId: string | null;      // Highlight active menu item
  onMenuClick: (path: string) => void;

  // History
  sessions: ChatSession[];
  activeSessionId: string | null;   // Highlight active session
  onSessionClick: (orderId: string) => void;
  onDeleteSession: (orderId: string) => void;
  onRenameSession: (orderId: string, newTitle: string) => void;

  // User (bottom section: avatar + name + settings + logout)
  userName: string;
  userAvatarUrl: string | null;
  onSettingsClick: () => void;    // Settings lives here, NOT in main menu
  onLogout: () => void;

  // Collapse
  collapsed: boolean;
  onToggleCollapse: () => void;
}

interface MenuItem {
  id: string;
  icon: string;           // Lucide icon name: 'Home', 'Calendar', 'Sparkles', 'Clapperboard', 'Target', 'Image'
  label: string;
  path: string;
  badge?: number;          // Optional notification count
}

interface ChatSession {
  orderId: string;         // "SF-20260207-X7K9"
  title: string;           // "3 Cara AI Bikin Lo Kaya"
  sessionType: 'script_gen' | 'creator_lab' | 'ad_studio';
  status: 'draft' | 'script_ready' | 'images_ready' | 'video_ready' | 'complete';
  updatedAt: string;       // ISO date

  // Progress tracking (for sidebar status badges)
  progress?: {
    totalSegments: number;     // e.g., 7
    imagesCompleted: number;   // e.g., 5 → shows "🖼️ 5/7"
    videosCompleted: number;   // e.g., 2 → shows "🎥 2/7"
    currentStep: 'script' | 'images' | 'video' | 'studio';
  };
}
```

**Visual wireframe:**
```
┌────────────────┐
│ [Logo] SPARK.. │  ← Clickable → /
│                │
│ ── Menu ────── │
│ 📊 Dashboard   │  → /dashboard
│ 📅 Planner     │  → /planner
│ ✨ Script Gen  │  → /script-gen (script only)
│ 🎬 Creator Lab │  → /creator-lab (full pipeline)
│ 🎯 Ad Studio   │  → /ad-studio (ad videos)
│ 🖼️ Gallery     │  → /gallery (My Library: generated images + videos)
│                │
│ ── History ─── │
│ Today          │
│  · 🟡 3 Cara.. │  → /script-gen/SF-20260207-X7K9
│  · 🟢 Revolu..│  → /creator-lab/SF-20260207-A3B2
│ Yesterday      │
│  · ✅ Tips I.. │  → /creator-lab/SF-20260206-M8N4
│ This Week      │
│  · ...         │
│                │
└────────────────┘

Sessions grouped by: "Today", "Yesterday", "This Week", "Older"
Each session: Title (truncated), dual-indicator (type icon + progress status), hover → rename/delete icons
Bottom: User avatar + name + [⚙️] Settings icon + logout
  (Settings lives here in user profile area, NOT in main menu — keeps menu focused on tools)
  (No "+ New" button — menu items above serve as new chat entry points)

**SESSION STATUS INDICATORS (Two-Layer System):**
Each history item shows BOTH the tool type AND the progress status:

  Left icon (tool type):
  - ✨ = Script Gen session (amber-500 icon)
  - 🎬 = Creator Lab session (emerald-500 icon)
  - 🎯 = Ad Studio session (violet-500 icon)

  Right status badge (progress):
  - 📝 "Draft" = Just created, no generation yet (text-muted, no badge)
  - ⏳ "Scripting" = Script generation in progress (pulsing amber dot)
  - 📄 "Script Ready" = Script done, awaiting image gen (solid amber dot)
  - 🖼️ "Images 3/7" = Image generation in progress (progress fraction, emerald)
  - 🎥 "Videos 2/7" = Video generation in progress (progress fraction, emerald)
  - ✅ "Complete" = All steps done (green-500 checkmark)

  Visual rendering:
  ```
  ┌──────────────────────────────────────┐
  │ Today                                │
  │  ✨ 3 Cara AI Bikin Lo K…  📄 Script │  ← Script Gen, script ready
  │  🎬 Revolusi UKM! AI Ch…  🖼️ 5/7    │  ← Creator Lab, 5 of 7 images
  │                                      │
  │ Yesterday                            │
  │  🎬 Tips Investasi Saha…  ✅         │  ← Creator Lab, complete
  │                                      │
  │ This Week                            │
  │  🎯 5 Morning Habits fo…  📝         │  ← Ad Studio, draft
  └──────────────────────────────────────┘
  ```

  In-progress items: The status badge has a subtle pulsing animation (opacity 0.6→1.0 loop)
  Complete items: Green checkmark, slightly muted title text (work is done)
  Draft items: No badge, just muted "Draft" text
  Active (currently open) item: bg-hover background + accent left border (2px)
```

---

### 3. ChatHome

```typescript
interface ChatHomeProps {
  userName: string;

  // Topic input form
  onGenerate: (formData: TopicFormData) => void;
  isGenerating: boolean;
  generatingPhase: number;          // 0-4 (loading overlay phases)
  generatingStep: string;           // Phase description text
  error: string | null;

  // Active Jobs (in-progress sessions that need attention)
  activeJobs: ActiveJob[];
  onJobClick: (orderId: string, step: string) => void;  // Navigate to workspace at correct step

  // Trending Topics (full discovery section)
  topics: TopicCard[];
  trendingChips: TrendingChip[];
  niches: NicheFilter[];
  activeNicheId: string | null;
  onSelectNiche: (nicheId: string | null) => void;
  onSelectTopic: (topic: TopicCard) => void;
  onSelectChip: (keyword: string) => void;
  onRefreshTopics: () => void;
  onLoadMoreTopics: () => void;
  onSearchTopics: (query: string) => void;
  isLoadingTopics: boolean;
  topicsPage: number;               // Current page (1-indexed)
  topicsTotalPages: number;          // Total pages available
  searchQuery: string;

  // Avatar
  avatarOptions: AvatarOption[];
  profileAvatarUrl: string | null;
}

interface ActiveJob {
  orderId: string;             // "SF-20260207-A3B2"
  title: string;               // "Revolusi UKM! AI ChatBot..."
  sessionType: 'script_gen' | 'creator_lab' | 'ad_studio';
  status: 'script_ready' | 'images_ready' | 'video_ready';
  updatedAt: string;           // ISO date — for "2 hours ago" relative time

  // Step progress
  steps: {
    script: 'completed' | 'current' | 'locked';
    images: 'completed' | 'current' | 'locked';
    video: 'completed' | 'current' | 'locked';
    studio: 'completed' | 'current' | 'locked';
  };

  // Progress counts
  totalSegments: number;       // e.g., 7
  imagesCompleted: number;     // e.g., 7 (all done)
  videosCompleted: number;     // e.g., 3
}

interface TopicFormData {
  prompt: string;
  inputType: 'topic' | 'transcript' | 'image' | 'link';
  duration: '30s' | '45s' | '60s' | '90s';
  aspectRatio: '9:16' | '16:9';
  language: 'id' | 'en' | 'hi' | 'fr';
  avatarOption: 'none' | 'profile' | 'saved' | 'upload';
  avatarId: string | null;
  avatarUrl: string | null;
  useDnaTone: boolean;

  // Image upload (inputType: 'image')
  imageFile: File | null;          // Screenshot/photo of trending topic
  imagePreviewUrl: string | null;  // Object URL for preview

  // Link transcription (inputType: 'link')
  linkUrl: string | null;          // YouTube/Instagram/TikTok URL
  linkPlatform: 'youtube' | 'instagram' | 'tiktok' | null;  // Auto-detected from URL
}

interface TopicCard {
  id: number;
  title: string;
  description: string;
  hashtags: string[];
  source: 'google' | 'tiktok' | 'instagram' | 'ai';
  sourceColor: string;            // Tailwind bg class: 'bg-blue-500' (google), 'bg-pink-500' (tiktok), etc.
  trendingVelocity: 'rising' | 'hot' | 'stable';   // Arrow indicator: ↑↑ rising, 🔥 hot, → stable
  engagementHint: string;         // e.g., "2.1M views on TikTok", "Trending #1 on Google"
  thumbnailUrl: string | null;    // Optional topic thumbnail (shows gradient placeholder if null)
  nicheId: string | null;         // Which niche this belongs to (null = general trending)
}

interface TrendingChip {
  keyword: string;
  source: 'google' | 'tiktok' | 'instagram';
  velocity: 'rising' | 'hot' | 'stable';   // Visual indicator on chip
}

interface NicheFilter {
  id: string;                     // e.g., 'technology', 'finance', 'lifestyle'
  label: string;                  // e.g., 'Technology', 'Finance & Crypto', 'Lifestyle'
  icon: string;                   // Lucide icon name: 'Cpu', 'TrendingUp', 'Heart'
  color: string;                  // Tailwind accent class: 'emerald', 'amber', 'cyan', 'violet', 'pink'
  topicCount: number;             // How many topics in this niche (shown as badge)
}

interface AvatarOption {
  id: string;
  name: string;
  url: string;
  type: 'profile' | 'saved';
}
```

**MULTI-MODAL INPUT (Image Upload + Link Transcription):**

The topic input area supports 3 input modes, toggled by the buttons below the textarea:

```
Default mode (topic/transcript):
┌──────────────────────────────────────────────┐
│ Describe your video topic...                 │  ← Textarea (auto-resize)
│                                              │
│ [📎 Image] [🔗 Link] [Or paste text...]     │  ← Mode buttons (pill style)
└──────────────────────────────────────────────┘

Image mode (after clicking 📎 Image):
┌──────────────────────────────────────────────┐
│ ┌────────────────────────────┐               │
│ │        📎                  │               │  ← Drop zone (dashed border)
│ │  Drop image or click to    │               │     Accepts: JPG, PNG, WEBP
│ │  upload screenshot         │               │     Max size: 5MB
│ │                            │               │
│ │  [Browse Files]            │               │
│ └────────────────────────────┘               │
│                                              │
│ (Optional) Add context about this image...   │  ← Small optional textarea
│                                              │
│ [📎 Image ✓] [🔗 Link] [✕ Back to text]    │  ← Active mode highlighted
└──────────────────────────────────────────────┘

Image mode (after upload — with preview):
┌──────────────────────────────────────────────┐
│ ┌──────────┐                                 │
│ │ 📷       │  screenshot_trending.png        │  ← Image preview thumbnail
│ │ Preview  │  245 KB  [✕ Remove]             │     + filename + size + remove
│ └──────────┘                                 │
│                                              │
│ "AI will analyze this image and create a     │
│  viral script based on the topic shown"      │  ← Helper text
│                                              │
│ (Optional) Add context: "This is trending    │
│  on TikTok FYP right now"                    │  ← Optional context textarea
│                                              │
│ [📎 Image ✓] [🔗 Link] [✕ Back to text]    │
└──────────────────────────────────────────────┘

Link mode (after clicking 🔗 Link):
┌──────────────────────────────────────────────┐
│ ┌────────────────────────────────────────┐   │
│ │ 🔗 Paste YouTube, Instagram, or        │   │  ← URL input field
│ │    TikTok link...                       │   │     with platform auto-detect
│ └────────────────────────────────────────┘   │
│                                              │
│  Auto-detected: 🎬 YouTube                   │  ← Shows detected platform icon
│  "AI will transcribe this video and create   │     after URL is pasted
│   a viral script inspired by it"             │
│                                              │
│ [📎 Image] [🔗 Link ✓] [✕ Back to text]    │
└──────────────────────────────────────────────┘

Platform auto-detection (from URL patterns):
  - youtube.com/watch, youtu.be → 🎬 YouTube
  - instagram.com/reel, instagram.com/p → 📷 Instagram
  - tiktok.com/@user/video → 🎵 TikTok
  - Invalid URL → show red error "Please enter a valid YouTube, Instagram, or TikTok link"
```

**Button behavior:**
- `[📎 Image]`: Toggles image upload mode. Active state: `bg-accent-subtle`, `text-accent`, `border-accent`
- `[🔗 Link]`: Toggles link input mode. Active state: same emerald accent
- `[✕ Back to text]`: Returns to default topic/transcript textarea mode
- Only ONE mode active at a time. Switching clears the other mode's data
- Generate button label changes: "Generate from Image ▶" / "Generate from Link ▶" / "Generate ▶"

**Visual wireframe (KEY: Trending Topics FIRST, topic input SECOND):**

The layout philosophy: **"Browse first, type second."** Users open Sparkfluence and immediately
see what's trending — they tap a topic and go. The text input is secondary, for users who already
know what they want. This reduces friction and leverages the platform's discovery engine.

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│        ✨ Hi ali                                             │
│     What's going viral today?                                │
│                                                              │
│  ── 🔥 TRENDING TOPICS (Primary — FIRST thing user sees) ── │
│  (Full discovery section: ticker + niches + cards)            │
│  (See TRENDING TOPICS DISCOVERY SECTION wireframe below)     │
│                                                              │
│  ── ✍️ OR DESCRIBE YOUR OWN ──────────────────────────────── │
│                                                              │
│  ┌──────────────────────────────────────────────┐            │
│  │ Describe your video topic...                 │            │  ← Topic input textarea
│  │                                              │            │
│  │ [📎 Image] [🔗 Link] [Or paste text...]     │            │  ← Multi-modal input
│  │                                              │            │
│  │ [9:16 ▼] [60s ▼] [ID ▼]                   │            │  ← Settings row
│  │ [Avatar ▼] [DNA ✓]                          │            │
│  │                              [Generate ▶]    │            │
│  └──────────────────────────────────────────────┘            │
│                                                              │
│  ── Active Jobs ──────────────────────────────────────── 📋  │
│  (Only shown when activeJobs.length > 0)                     │
│  ┌──────────────────┐ ┌──────────────────┐                   │
│  │ 🎬 Revolusi UKM  │ │ 🎬 Tips Investa..│                   │
│  │ SF-..A3B2        │ │ SF-..M8N4        │                   │
│  │ 2h ago           │ │ Yesterday        │                   │
│  │                  │ │                  │                   │
│  │ ✅ Script        │ │ ✅ Script        │                   │
│  │ ●  Images  5/7   │ │ ✅ Images  7/7   │                   │
│  │ 🔒 Video         │ │ ●  Videos  3/7   │                   │
│  │ 🔒 Studio        │ │ 🔒 Studio        │                   │
│  │                  │ │                  │                   │
│  │ ▓▓▓▓▓▓▓░░░ 71%  │ │ ▓▓▓▓▓▓▓▓░░ 80%  │                   │
│  │                  │ │                  │                   │
│  │ [Continue →]     │ │ [Continue →]     │                   │
│  └──────────────────┘ └──────────────────┘                   │
│                                                              │
└──────────────────────────────────────────────────────────────┘

**LAYOUT ORDER (top to bottom):**
  1. Greeting + subtitle ("What's going viral today?")
  2. 🔥 TRENDING TOPICS — ticker + niche filters + search + topic cards grid (PRIMARY)
  3. Divider with "Or describe your own" label
  4. Topic input card (textarea + multimodal + settings + generate button) (SECONDARY)
  5. Active Jobs (only if any in-progress sessions exist)

**WHY this order matters:**
  - The platform's VALUE PROP is discovery — finding viral topics easily
  - Most users don't know what to make a video about. Show them first.
  - Users who already have a topic can scroll past trending (or use ⌘K search)
  - Clicking any topic card auto-fills the topic input below AND scrolls to it
  - This feels like "Instagram Explore meets Gemini" — discovery-driven, not input-driven
```

**ACTIVE JOBS SECTION:**
  - Only rendered when `activeJobs.length > 0`
  - Horizontal scrollable row of cards (max 4 visible, scroll for more)
  - Each card: `bg-surface`, rounded-xl, p-4, border-l-4 (colored by current step)
    - Border color: images step = emerald, video step = cyan, studio = amber
  - Card contents:
    - Top: Session type icon + title (truncated) + relative time ("2h ago")
    - Middle: Mini step progress — 4 rows showing Script/Images/Video/Studio
      - Each row: status icon (✅ done, ● current with pulse, 🔒 locked) + label + count (e.g., "5/7")
      - Current step row is highlighted with accent color text
    - Bottom: Progress bar (overall %, computed from completed steps) + [Continue →] button
  - Click on card OR [Continue →]: navigates to `/creator-lab/:orderId/:currentStep`
  - Empty state (no active jobs): Section is hidden entirely (NOT a blank space)
  - Max cards shown: 4. If more, show "View all (N)" link → navigates to /dashboard

**TRENDING TOPICS DISCOVERY SECTION (Premium Redesign):**

This is NOT a basic card grid. It's a **content discovery engine** — think Perplexity's source cards meets Spotify's genre exploration meets Bloomberg's ticker energy. The section is divided into 3 visual layers:

**Layer 1: Live Trending Ticker (Horizontal Scrolling Strip)**
```
┌────────────────────────────────────────────────────────────────────────┐
│ 🔥 Trending Now                                              [🔄 ↻]  │
│                                                                        │
│  ←  [🔵 Epstein List ↑↑] [🩷 AI Trading Bot 🔥] [🔵 React 20 →]    │
│      [🩷 Mie Gacoan IPO ↑↑] [🟣 Cristiano Ronaldo 🔥] ...     →    │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘

  - Horizontally auto-scrolling strip (CSS marquee-like, pausable on hover)
  - Each chip: rounded-full, px-4 py-2, bg-surface, border border-border
    - Source dot: 🔵 Google (blue), 🩷 TikTok (pink), 🟣 Instagram (violet)
    - Velocity indicator: ↑↑ (rising, emerald), 🔥 (hot, amber), → (stable, muted)
    - Hot chips get a subtle pulsing glow border (`ring-1 ring-amber-500/30 animate-pulse`)
    - Rising chips have a small green arrow animation
  - Click a chip → fills the topic input textarea with that keyword + smooth-scrolls to input card
  - Refresh button (🔄) at right: re-fetches trending data with rotate animation
  - The strip should feel "alive" — like a stock ticker or live feed
```

**Layer 2: Niche Filter Bar (Horizontal Pill Tabs)**
```
┌────────────────────────────────────────────────────────────────────────┐
│  [All ✓] [💻 Technology (8)] [💰 Finance (5)] [🎨 Lifestyle (6)]    │
│  [🎮 Gaming (4)] [🏋️ Health (3)] [📱 Social Media (7)]              │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────┐      │
│  │ 🔍 Search trending topics...                    [⌘K]       │      │
│  └─────────────────────────────────────────────────────────────┘      │
└────────────────────────────────────────────────────────────────────────┘

  - Horizontal scrollable row of pill-shaped filter buttons
  - "All" is always first and selected by default
  - Each niche pill: icon (from NicheFilter.icon) + label + count badge (topic count)
  - Active pill: bg-accent-subtle, text-accent, ring-1 ring-accent
  - Inactive: bg-surface, text-secondary, hover:bg-hover
  - Clicking a niche filters the topic cards below (with fade transition)
  - Clicking active niche again deselects it (back to "All")

  Search bar:
  - Below the niche pills
  - bg-surface, rounded-lg, border-border, focus:ring-accent
  - Placeholder: "Search trending topics..."
  - Right side: keyboard shortcut hint [⌘K] in text-muted
  - Instant filtering as user types (debounced 300ms)
  - Shows "No topics match '...'" empty state with dashed border if no results
```

**Layer 3: Topic Cards Grid (Premium Cards with Source Identity)**
```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────┐│
│  │ ┌────────────────┐   │  │ ┌────────────────┐   │  │ ┌──────────┐ ││
│  │ │ 🖼️ Thumbnail   │   │  │ │ Gradient        │   │  │ │ Gradient │ ││
│  │ │ or gradient     │   │  │ │ placeholder     │   │  │ │          │ ││
│  │ │ placeholder     │   │  │ │ (warm emerald)  │   │  │ └──────────┘ ││
│  │ └────────────────┘   │  │ └────────────────┘   │  │              ││
│  │                       │  │                       │  │ 🩷 TikTok   ││
│  │ 🔵 Google  ↑↑ Rising │  │ 🩷 TikTok  🔥 Hot   │  │              ││
│  │                       │  │                       │  │ Mie Gacoan  ││
│  │ Jeffrey Epstein List  │  │ AI Trading Bot Bikin  │  │ IPO: Ini    ││
│  │ Terbaru: Nama-nama    │  │ 50 Juta dalam 3 Bulan│  │ Peluang Lo! ││
│  │ yang Terlibat          │  │                       │  │              ││
│  │                       │  │ 2.1M views on TikTok  │  │ #MieGacoan  ││
│  │ Trending #1 on Google │  │                       │  │ #IPO #Stonks││
│  │                       │  │ #AI #Trading #Bot     │  │              ││
│  │ #Epstein #Breaking    │  │ #PassiveIncome         │  │ [Use Topic] ││
│  │ #Viral                │  │                       │  │              ││
│  │                       │  │ [Use Topic]            │  └──────────────┘│
│  │ [Use Topic]           │  │                       │                  │
│  │                       │  └──────────────────────┘                  │
│  └──────────────────────┘                                              │
│                                                                        │
│                    [Load More Topics (1/4)] ↓                          │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘

Topic Card Design:
  - `bg-surface`, rounded-xl, overflow-hidden, border border-border
  - Hover: subtle `border-border-hover` + `translate-y-[-2px]` lift (150ms ease)
  - Click anywhere on card: same as [Use Topic] button

  Top section (thumbnail):
  - `aspect-[16/9]` thumbnail area at top of card (landscape banner, NOT 9:16 here)
  - If `thumbnailUrl`: show image with `object-cover`
  - If null: show gradient placeholder — colors based on source:
    - Google: `bg-gradient-to-br from-blue-600/20 to-blue-900/20`
    - TikTok: `bg-gradient-to-br from-pink-600/20 to-pink-900/20`
    - Instagram: `bg-gradient-to-br from-violet-600/20 to-violet-900/20`
    - AI: `bg-gradient-to-br from-emerald-600/20 to-emerald-900/20`
  - Gradient placeholders have subtle noise texture (css background-image: url(data:... noise svg))

  Source + Velocity row (just below thumbnail):
  - Left: Source badge — rounded-full, px-2 py-0.5, 11px text
    - Google: `bg-blue-500/15 text-blue-400` + [Globe icon]
    - TikTok: `bg-pink-500/15 text-pink-400` + [Music icon]
    - Instagram: `bg-violet-500/15 text-violet-400` + [Camera icon]
    - AI: `bg-emerald-500/15 text-emerald-400` + [Sparkles icon]
  - Right: Velocity indicator
    - Rising: "↑↑ Rising" in `text-emerald-400` (green arrow animation)
    - Hot: "🔥 Hot" in `text-amber-400` (subtle glow)
    - Stable: "→ Stable" in `text-muted`

  Title: 16px, font-weight 600, `text-primary`, max 2 lines with line-clamp
  Description: 13px, `text-secondary`, max 2 lines with line-clamp
  Engagement hint: 12px, `text-muted`, italic — "2.1M views on TikTok", "Trending #1 on Google"

  Hashtags: Row of small rounded pills
  - `bg-white/5`, rounded-full, px-2 py-0.5, 11px, `text-muted`
  - Max 3 visible, "+N more" if overflow

  [Use Topic] button: Full-width at bottom
  - Default: invisible (opacity-0), shown on card hover (opacity-100 transition)
  - Style: `bg-accent`, `text-white`, rounded-lg, py-2, font-weight 500
  - Click: fills topic textarea with card title + description

Grid:
  - `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`, gap-4
  - Default: 6 cards visible (2 rows)
  - [Load More Topics (1/4)] button below grid — centered, text-accent, hover underline
  - Loading more: skeleton cards with shimmer animation (warm gray pulse)
  - End of pages: "That's all for now! 🎉 Try a different niche or search." (muted text)
```

**Trending Topics — Interaction States:**
  - `isLoadingTopics = true`: All 3 layers show skeleton state:
    - Ticker: shimmer pills scrolling
    - Niches: shimmer pills
    - Cards: 6 skeleton cards with gradient shimmer
  - Empty search: "No topics match '...' — try a different keyword" with dashed border
  - Empty niche: "No trending topics in [Niche] right now" with refresh button
  - The whole section should feel like a **live discovery feed**, NOT a static page

- Page is a scrollable feed (NOT centered vertically) — greeting at top, then trending, then input, then active jobs
- No centering needed — the trending topics section IS the main content, always visible immediately
- When clicking a topic card: auto-fills topic input textarea AND smooth-scrolls down to it
- When clicking a trending chip: same behavior — fills input + scrolls to it
- Loading overlay: Full-screen with organic, creative animation (NOT a spinner)
  - Background: Pulsing gradient mesh (emerald → warm charcoal → back) that 'breathes'
  - Center: Phase text with subtle fade transition between steps
  - Phase 0: "Analyzing topic..."
  - Phase 1: "Crafting viral structure..."
  - Phase 2: "Writing segments..."
  - Phase 3: "Generating hook options..."
  - Phase 4: "Scoring virality..."
  - The animation should feel like the AI is 'thinking creatively', not buffering
- Transition: When generation completes, the input card should animate/expand into the Workspace view.
  The ChatHome → Workspace transition must NOT feel like a hard page reload.
  Use a smooth layout animation (e.g., card expanding, content fading in).
```

---

### 4. Workspace

```typescript
interface WorkspaceProps {
  orderId: string;
  title: string;
  activeStep: 'script' | 'images' | 'video' | 'studio';
  onStepChange: (step: string) => void;

  // Step lock states
  steps: StepInfo[];

  // Left Wing — Context Panel (desktop only, script step only)
  contextPanel: ContextPanelData | null;

  // Right Wing — Live Simulator (desktop only)
  simulatorSegment: SimulatorPreview | null;

  // Render active step content (Center — always visible)
  children: React.ReactNode;
}

interface StepInfo {
  id: 'script' | 'images' | 'video' | 'studio';
  label: string;            // "Script", "Images", "Video", "Studio"
  icon: string;             // Lucide icon name
  status: 'locked' | 'active' | 'completed' | 'current';
  badge?: string;           // e.g., "7 segments", "3/7 done"
}

interface ContextPanelData {
  // Velocity Meter — trending topics related to current script topic
  velocityTopics: VelocityTopic[];

  // Style Memory — user's brand kit (colors, fonts, tone)
  brandKit: BrandKit | null;

  // Pre-Flight Checklist (shown when approaching video generation)
  preFlightItems: PreFlightItem[];
}

interface VelocityTopic {
  keyword: string;
  velocity: number;           // 0-100 (how fast it's rising)
  direction: 'up' | 'down' | 'stable';
  source: 'google' | 'tiktok' | 'instagram';
}

interface BrandKit {
  primaryColor: string;       // hex
  secondaryColor: string;     // hex
  toneName: string;           // e.g., "Casual & Energetic"
  toneEmoji: string;          // e.g., "⚡"
  preferredHashtags: string[];
}

interface PreFlightItem {
  id: string;
  label: string;              // "Hook", "Pacing", "CTA", "Images", "Duration"
  status: 'pass' | 'warn' | 'fail' | 'pending';
  detail: string;             // "Strong", "Fast", "Included", "7/7", "60s"
}

interface SimulatorPreview {
  segmentNumber: number;
  segmentType: string;
  shotType: 'CREATOR' | 'B-ROLL';
  duration: number;
  scriptPreview: string;        // First 50 chars of script
  visualPreview: string;        // First 80 chars of visual direction
  imageUrl: string | null;      // If image exists, show it
}
```

**Visual — TRINITY POWER VIEW (3-Column Command Center):**
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Top Bar: [SF-20260207-X7K9] "3 Cara AI Bikin Lo K..." (editable)           │
│ StepBar: [✓ Script] ——— [● Images] ——— [🔒 Video] ——— [🔒 Studio]        │
├─────────────┬────────────────────────────────────┬──────────────────────────┤
│ LEFT WING   │         CENTER (The Heart)         │     RIGHT WING          │
│ (The Brain) │                                    │     (The Body)          │
│ w-[240px]   │         flex-1                     │     w-[280px]           │
│             │                                    │                         │
│ ── Velocity │    [Active Step Content]            │   ┌──────────────────┐ │
│ 📈 AI Trade │    (ScriptStep / ImageStep /       │   │                  │ │
│    ↑↑ 87    │     VideoStep / StudioStep)        │   │   9:16 Phone     │ │
│ 📈 Epstein  │                                    │   │   Frame Preview  │ │
│    🔥 95    │    children rendered here           │   │                  │ │
│ 📈 React 20 │    Full scrollable workspace       │   │  Shows visual    │ │
│    ↑↑ 72    │                                    │   │  for currently   │ │
│             │                                    │   │  selected        │ │
│ ── Brand Kit│                                    │   │  segment         │ │
│ 🎨 #10B981  │                                    │   │                  │ │
│ ⚡ Casual   │                                    │   │  (placeholder    │ │
│ #AI #Viral  │                                    │   │   with type +    │ │
│             │                                    │   │   VD overlay)    │ │
│ ── Checklist│                                    │   │                  │ │
│ Hook: ✅    │                                    │   └──────────────────┘ │
│ Pacing: ✅  │                                    │                         │
│ CTA: ✅     │                                    │   Seg: 1 / 7            │
│ Images: 5/7 │                                    │   Duration: 8s          │
│ Duration:60s│                                    │   Shot: CREATOR         │
├─────────────┴────────────────────────────────────┴──────────────────────────┤
└──────────────────────────────────────────────────────────────────────────────┘

**TRINITY LAYOUT RULES:**
  - Full 3-column only on screens ≥ 1440px wide
  - 1280px-1440px: Hide Left Wing, show Center + Right Wing (2-column)
  - < 1280px: Center only (full width), both wings hidden
  - Left Wing: sticky, scrollable, bg-surface, border-r border-border
  - Center: flex-1, scrollable, padding 20px
  - Right Wing: sticky, bg-surface, border-l border-border

**LEFT WING — "The Brain" (Context Panel):**
  - Only visible during Script step. Hidden during Image/Video/Studio steps.
  - Section 1: VELOCITY METER
    - Title: "📈 Trending Near You" (small, text-muted)
    - List of 5-8 keywords related to current topic
    - Each: keyword + velocity bar (0-100, colored gradient) + direction arrow
    - Velocity bar: gradient from gray (low) → amber (medium) → emerald (high)
    - Click a keyword → inserts into nearest focused script textarea
    - This helps users inject trending keywords into their scripts
  - Section 2: BRAND KIT / STYLE MEMORY
    - Title: "🎨 Your Style" (small, text-muted)
    - Shows: Primary color swatch + tone description + preferred hashtags
    - Empty state: "Set up your brand kit in Settings" with link
    - This is read-only context — reminds user of their brand voice
  - Section 3: PRE-FLIGHT CHECKLIST
    - Title: "✈️ Ready to Generate?" (small, text-muted)
    - Compact vertical list of check items
    - Each: icon + label + status badge (✅ pass = green, ⚠️ warn = amber, ❌ fail = red, ⏳ pending = gray)
    - Updates in real-time as user edits script
    - When all items pass → the "Confirm & Continue" button gets an emerald glow pulse

**RIGHT WING — "The Body" (Live Simulator):**
  - Sticky sidebar (position: sticky, top: header height)
  - Contains a realistic 9:16 phone frame (rounded-[2rem], bg-black, ring-1 ring-white/10)
  - Inside the frame: dark placeholder showing the currently hovered/selected segment
    - If no image yet: dark bg with segment type label + visual direction text overlay
    - If image exists: shows the actual image with object-cover
  - Below frame: Segment metadata (number, type, duration, shot type)
  - Updates instantly when user clicks or hovers a different segment card
  - This bridges "Abstract Text" ↔ "Concrete Video Output"
```

---

### 5. StepBar

```typescript
interface StepBarProps {
  steps: StepInfo[];
  activeStep: string;
  onStepClick: (stepId: string) => void;
}

// Visual: Horizontal bar with 4 circular step indicators connected by lines
// Each step: circle icon + label below
// Colors: completed = green-500, current = emerald-500 (with subtle glow ring), locked = gray-600
// Clickable only when status is not 'locked'
```

---

### 6. ScriptStep

```typescript
interface ScriptStepProps {
  // Segments
  segments: ScriptSegment[];
  onEditSegment: (segmentId: string, field: 'script' | 'visualDirection', value: string) => void;
  onFixSegment: (segmentId: string) => void;   // One-Click Fix: AI rewrites weak segment

  // Hook selector
  hookOptions: HookOptions | null;
  selectedHook: string;
  onSelectHook: (key: string) => void;

  // Virality score
  viralityScore: number;            // 0-100
  scoreBreakdown: ScoreBreakdown;

  // Regenerate
  onRegenerate: () => void;
  isRegenerating: boolean;
  canRegenerate: boolean;           // false if any image exists

  // Comparison
  comparisonData: ComparisonData | null;  // null = not comparing
  onKeepVersion: (version: number) => void;
  onDismissComparison: () => void;

  // Semantic Highlighting — AI-suggested chips based on script keywords
  suggestedChips: DirectorChip[];          // Auto-generated from script text analysis
  onAcceptSuggestedChip: (chip: DirectorChip) => void;
  onDismissSuggestedChip: (chipId: string) => void;

  // Additional notes
  additionalNotes: string;
  onNotesChange: (notes: string) => void;

  // Confirm
  scriptConfirmed: boolean;
  onConfirm: () => void;
  onUnconfirm: () => void;          // Allow edit again (if no images yet)

  // Visual Haptics — typewriter animation state
  isAITyping: boolean;              // true when AI is generating/rewriting text
  aiTypingSegmentId: string | null; // Which segment is currently being typed
}

interface ScriptSegment {
  id: string;
  segmentNumber: number;
  segmentType: string;              // "HOOK", "FORE", "BODY-1", "BODY-2", "PEAK", "CTA", "LOOP-END"
  shotType: 'CREATOR' | 'B-ROLL';
  duration: number;                 // seconds
  script: string;
  visualDirection: string;
  directorChips: DirectorChip[];    // Parsed from visualDirection into structured chips
  emotion: string;
  maxWords: number;
  wordCount: number;                // Current word count
  isOverLimit: boolean;             // wordCount > maxWords
  retentionLevel: 'high' | 'medium' | 'low';  // Drives left-border heatmap color
  needsFix: boolean;                // true if retention is 'low' — shows [✨ Fix] button
  isFixing: boolean;                // true while AI is rewriting this segment

  // Waveform Overlay — speech timing visualization
  estimatedSpeechSeconds: number;   // Estimated duration to speak the script text (word count / WPM)
  waveformFill: number;             // 0-1 ratio: estimatedSpeechSeconds / duration. >1.0 = overflow (red)
}

interface DirectorChip {
  id: string;
  type: 'camera' | 'action' | 'sfx' | 'vfx' | 'text_pop' | 'cut';
  label: string;                    // e.g., "Medium → Push-in", "Ding", "3 CARA AI"
  icon: string;                     // Lucide icon: 'Video', 'Clapperboard', 'Volume2', 'Sparkles', 'Type', 'Scissors'
  color: string;                    // Tailwind class: 'blue', 'amber', 'green', 'violet', 'pink', 'orange'
}

interface HookOptions {
  option_a_safe: {
    script_text: string;
    visual_direction: string;
    hook_type: string;              // e.g., "curiosity_gap"
  };
  option_b_negative: {
    script_text: string;
    visual_direction: string;
    hook_type: string;
  };
  option_c_visual: {
    script_text: string;
    visual_direction: string;
    hook_type: string;
  };
}

interface ScoreBreakdown {
  hook: { score: number; status: 'pass' | 'warn' | 'fail' };
  pacing: { score: number; status: 'pass' | 'warn' | 'fail' };
  density: { score: number; status: 'pass' | 'warn' | 'fail' };
  cta: { score: number; status: 'pass' | 'warn' | 'fail' };
  editingCues: { score: number; status: 'pass' | 'warn' | 'fail' };
}

interface ComparisonData {
  version1: { segments: ScriptSegment[]; score: number };
  version2: { segments: ScriptSegment[]; score: number };
  aiRecommendation: 1 | 2;         // Which version AI recommends
}
```

**Visual Layout:**
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Top row:                                                                     │
│ [ViralityScore card (compact)] [🔄 Regenerate] [✅ Confirm & Continue]      │
│                                                                              │
│ ┌──────────────────────────────────────────────┐  ┌──────────────────────┐  │
│ │ Segment cards (left, scrollable):            │  │ 📱 LIVE SIMULATOR   │  │
│ │                                               │  │ (Sticky right panel) │  │
│ │ ┌─ ─────────────────────────────────────────┐│  │                      │  │
│ │ │█│ 1  HOOK  CREATOR  8s                    ││  │ ┌──────────────────┐ │  │
│ │ │█│ ┌──────────┬──────────┬──────────┐      ││  │ │                  │ │  │
│ │ │█│ │🟢 Safe   │🔴 Bold   │👁 Visual │      ││  │ │   9:16 Phone    │ │  │
│ │ │█│ └──────────┴──────────┴──────────┘      ││  │ │   Frame Preview │ │  │
│ │ │█│                                          ││  │ │                  │ │  │
│ │ │█│ Script: "Gue baru nemuin 3 cara AI..."  ││  │ │  Shows visual   │ │  │
│ │ │█│ Words: 11/14                     ✨ [AI] ││  │ │  for currently  │ │  │
│ │ │█│                                          ││  │ │  selected       │ │  │
│ │ │█│ Director Chips:                          ││  │ │  segment        │ │  │
│ │ │█│ [🎥 Medium→Push-in] [✨ TEXT: 3 CARA AI]││  │ │                  │ │  │
│ │ │█│ [🔊 SFX: Ding] [+ Add]                  ││  │ │  (placeholder   │ │  │
│ │ │█│                                          ││  │ │   with segment  │ │  │
│ │ │█│ Hook Type: curiosity_gap                 ││  │ │   type + VD     │ │  │
│ │ │█└──────────────────────────────────────────┘│  │ │   text overlay) │ │  │
│ │ │                                              │  │ │                  │ │  │
│ │  (█ = Retention Heatmap — emerald left border) │  │ └──────────────────┘ │  │
│ │                                               │  │                      │  │
│ │ ┌─ ─────────────────────────────────────────┐│  │ Segment: 1 / 7       │  │
│ │ │▓│ 2  FORE  B-ROLL  10s                   ││  │ Duration: 8s          │  │
│ │ │▓│ Script: "Yang ketiga literally..."       ││  │ Shot: CREATOR         │  │
│ │ │▓│ Words: 12/17                     ✨ [AI] ││  └──────────────────────┘  │
│ │ │▓│ [🎬 CUT TO: Montage] [🎥 Drone Pull-out]││                            │
│ │ │▓│ [+ Add]                                  ││                            │
│ │ │▓└──────────────────────────────────────────┘│                            │
│ │                                               │                            │
│ │  (▓ = amber left border — medium retention)   │                            │
│ │                                               │                            │
│ │ ... (BODY-1, BODY-2, PEAK, CTA, LOOP-END)   │                            │
│ │                                               │                            │
│ │ ┌────────────────────────────────────────┐    │                            │
│ │ │ Additional Notes                       │    │                            │
│ │ │ [textarea: "Add feedback for AI..."]   │    │                            │
│ │ └────────────────────────────────────────┘    │                            │
│ └──────────────────────────────────────────────┘                             │
└──────────────────────────────────────────────────────────────────────────────┘

**RETENTION HEATMAP (Left Border):**
  Each segment card has a 4px left border with inset box-shadow:
  - HOOK, PEAK: `shadow-[inset_4px_0_0_0_#10B981]` (emerald — high retention)
  - FORE, BODY-*: `shadow-[inset_4px_0_0_0_#F59E0B]` (amber — medium retention)
  - CTA: `shadow-[inset_4px_0_0_0_#06B6D4]` (cyan — call to action)
  - LOOP-END: `shadow-[inset_4px_0_0_0_#78716C]` (muted gray)
  This acts like "Grammarly for Retention" — users see weak spots at a glance.

**DIRECTOR CHIPS (Visual Direction):**
  Visual Direction is NOT a textarea. It renders as a row of styled chips:
  - Each chip: rounded-full, px-3 py-1, 12px text, icon prefix, colored by type
  - Chip types + colors:
    🎥 Camera (blue-500/10, text-blue-400): "Medium Shot", "Push-in", "Drone"
    🎬 Action/Cut (amber-500/10, text-amber-400): "CUT TO: Montage", "Whip-pan"
    🔊 SFX (green-500/10, text-green-400): "Ding", "Boom", "Cash Register"
    ✨ VFX (violet-500/10, text-violet-400): "Blur → Sharp", "Slow-mo"
    📝 Text Pop (pink-500/10, text-pink-400): "3 CARA AI", "KETINGGALAN"
    ✂️ Cut (orange-500/10, text-orange-400): "CUT TO: Screen recording"
  - [+ Add] button at end: opens small dropdown with category buttons
  - Clicking a chip allows inline editing; long-press/right-click to delete
  - This gives instant visual variety awareness (all blue chips? = monotone camera work!)
  - **CHIP HOVER PREVIEW:** When hovering a Director Chip, show a 1-second micro-animation
    tooltip demonstrating the camera movement/effect. Examples:
    - "Zoom-in": small box that scales from 1.0→1.3
    - "Whip-pan": content slides rapidly left
    - "Jump Cut": frame flickers/snaps
    - These are pure CSS animations inside a 80x120px tooltip (bg-elevated, rounded-md)
    - Helps non-filmmakers understand what each direction actually looks like

**CONTEXTUAL AI TOOLTIP (Magic Wand):**
  When user focuses on a segment card for >2s OR highlights text in the script:
  - A small floating bar appears (like Notion AI / Medium highlight menu)
  - Position: above the selection or top-right of the focused card
  - Options vary by context:
    - On HOOK script: [✨ Make Punchier] [🔥 Add Shock Value]
    - On BODY script: [✂️ Shorten] [💡 Simplify] [🔄 Rewrite]
    - On Director Chips: [🎬 Suggest B-Roll] [🎥 Add Camera Move] [🔊 Add SFX]
    - On CTA script: [🎯 Stronger CTA] [😊 Softer Tone]
  - Style: bg-elevated, rounded-lg, shadow-float, small pill buttons with icons
  - This keeps users in "flow state" — power at the cursor, not in distant menus.

Segment card header:
  [segmentNumber] [segmentType badge (colored)] [shotType badge] [duration + "s"] [✨ Fix] (if needsFix=true)

  **ONE-CLICK FIX BUTTON:**
  - Only visible when `needsFix = true` (segment has low retention / weak pacing)
  - Position: right side of card header, after duration
  - Style: small pill button, `bg-amber-500/15 text-amber-400`, with subtle pulse animation
  - Label: "✨ Fix" — click triggers `onFixSegment(segmentId)`
  - While fixing (`isFixing = true`): button changes to "⏳ Fixing..." with emerald pulse
  - After fix: new text appears with typewriter animation (Visual Haptics)

**Typography hierarchy within each card (CRITICAL):**
  - Script text (spoken words): 15px, font-weight 400, `--text-primary` (bright, hero content)
  - Director Chips: 12px, colored by type, inside `bg-{color}-500/10` rounded-full containers
    This creates a clear "what they say" (script) vs "what you see" (chips) rhythm
  - Word count: 12px, right-aligned. Green when within limit, Red when over (isOverLimit = true)

**WAVEFORM OVERLAY (Speech Timing Bar):**
  Below the script text in each segment card, show a thin horizontal bar:
  ```
  ┌──────────────────────────────────────────┐
  │ "Gue baru nemuin 3 cara AI yang..."     │  ← Script text (hero)
  │                                          │
  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░  6.2s / 8s         │  ← Waveform bar (speech vs duration)
  │                                          │
  │ [🎥 Medium→Push-in] [📝 3 CARA AI]     │  ← Director Chips
  └──────────────────────────────────────────┘
  ```
  - Bar width = `waveformFill * 100%` (capped at 100% visually, overflow indicated by color)
  - Colors: ≤0.7 = emerald (plenty of room), 0.7-0.9 = amber (tight), >0.9 = red (overflow!)
  - Right label: "{estimatedSpeechSeconds}s / {duration}s"
  - If overflow (>1.0): bar extends beyond container with red glow + "⚠️ Too long" tooltip
  - This makes timing issues INSTANTLY visible — no guesswork about whether text fits

**SEMANTIC HIGHLIGHTING (Auto-Suggested Chips):**
  When user types keywords in script text that map to visual concepts, show a suggestion row:
  ```
  Script: "Gue tunjuk dashboard profit yang naik gila-gilaan"
                   ↓ detected: "dashboard", "profit", "naik"
  💡 Suggested: [🎥 Screen Recording] [📝 PROFIT ↑] [✨ Green overlay]  [✕ Dismiss all]
  ```
  - Suggestion row appears between script text and Director Chips
  - Each suggested chip has a dashed border (not solid) to indicate it's a suggestion
  - Click to accept → chip moves to Director Chips row (solid border)
  - [✕] to dismiss individual chip, [✕ Dismiss all] to clear suggestions
  - Style: `border-dashed border-accent/30`, slightly faded compared to accepted chips

**VISUAL HAPTICS (Typewriter Animation):**
  When `isAITyping = true` for a segment:
  - Script text appears character by character (40-60ms per char)
  - Slight pause (150ms) at commas, longer pause (300ms) at periods
  - A blinking cursor (emerald, 1px wide) follows the text
  - The segment card has a subtle emerald glow border during typing
  - This applies to: initial generation, One-Click Fix rewrites, and AI tooltip actions
  - Mock: bolt.new should implement the typewriter CSS animation on a sample segment

HOOK card special: Has HookSelector tabs at top
LOOP-END card: Has ON/OFF toggle (default ON), grayed out when OFF
```

---

### 7. HookSelector

```typescript
interface HookSelectorProps {
  options: HookOptions;
  selectedKey: string;              // 'option_a_safe' | 'option_b_negative' | 'option_c_visual'
  onSelect: (key: string) => void;
  disabled: boolean;                // true after script confirmed
}

// Visual: 3 horizontal tab buttons inside the HOOK segment card
// Tab labels with colors:
//   "🟢 Safe" (green border when active)
//   "🔴 Bold" (red/orange border when active)
//   "👁 Visual" (cyan/blue border when active)
// Below tabs: Preview of selected hook's script_text + hook_type badge
// Disabled state: tabs are grayed out, not clickable
//
// **TONE TINTING (Premium UX):**
// When a hook tab is selected, the ENTIRE HOOK card gets a subtle background tint:
//   Safe selected → subtle green tint (rgba(34, 197, 94, 0.04))
//   Bold selected → subtle red/warm tint (rgba(239, 68, 68, 0.04))
//   Visual selected → subtle cyan tint (rgba(6, 182, 212, 0.04))
// This gives immediate visual feedback on the *tone* of the video at a glance.
// The tint should be very subtle — just enough to notice, not enough to distract.
```

---

### 8. ViralityScore

```typescript
interface ViralityScoreProps {
  score: number;                    // 0-100
  breakdown: ScoreBreakdown;
  compact?: boolean;                // Small inline vs expanded card
}
```

**Visual (expanded card):**
```
┌─────────────────────────────┐
│      ┌───────┐              │
│      │  87%  │              │  ← Big number inside circular progress ring
│      └───────┘              │     (emerald gradient ring, NOT purple)
│                             │
│  [Hook ✅ 95] [Pacing ✅ 90]│  ← 5 small pills
│  [Density ⚠️ 75] [CTA ✅ 88]│
│  [Cues ✅ 92]               │
└─────────────────────────────┘

Color coding: ≥80 = green ✅, 60-79 = yellow ⚠️, <60 = red ❌
```

**Visual (compact):**
```
[87% viral ●]  ← Small inline badge with color dot
```

---

### 9. ScriptComparison (Inline Diff + Modal)

```typescript
interface ScriptComparisonProps {
  isOpen: boolean;
  viewMode: 'inline' | 'side-by-side';      // Default: 'inline' (NEW)
  onViewModeChange: (mode: 'inline' | 'side-by-side') => void;
  version1: { segments: ScriptSegment[]; score: number; hookOptions: HookOptions };
  version2: { segments: ScriptSegment[]; score: number; hookOptions: HookOptions };
  aiRecommendation: 1 | 2;
  onKeepVersion1: () => void;
  onUseVersion2: () => void;
  onClose: () => void;
  isLoading: boolean;               // true while V2 is generating
}
```

**Visual — INLINE DIFF MODE (Default, preferred):**
```
No modal needed! Changes appear directly on the existing segment cards:

┌─ ─────────────────────────────────────────────────────────────────┐
│█│ 1  HOOK  CREATOR  8s                          [V1: 87%→V2: 92%]│
│█│                                                                  │
│█│ Script:                                                          │
│█│ ~~Gue baru nemuin 3 cara AI~~  Lo masih kerja manual di 2026?   │
│█│ ~~yang literally bikin~~        Ketinggalan parah.               │
│█│ ~~passive income.~~                                              │
│█│                                                                  │
│█│ (strikethrough = removed, highlighted emerald = added)           │
│█│                                                                  │
│█│         ┌─────────────────────────────────┐                      │
│█│         │  [✅ Accept V2]  [↩ Keep V1]   │  ← Floating action bar│
│█│         └─────────────────────────────────┘                      │
│█└──────────────────────────────────────────────────────────────────┘

Styling:
  - Removed text: `text-red-500/50 line-through` (faded, struck through)
  - Added text: `text-emerald-400 font-medium bg-emerald-500/5 rounded px-1`
  - Floating action bar: follows the diff area, bg-elevated, shadow-float, rounded-lg
  - Each segment shows its diff independently — user can scan all changes in context
  - Score comparison badge at top of each changed card: "V1: 87% → V2: 92%"
```

**Visual — SIDE-BY-SIDE MODE (Alternative, via toggle):**
```
┌──────────────────────────────────────────────────────┐
│  Compare Script Versions   [Inline | Side-by-Side] [X]│
│                                                      │
│  ┌────────────────────┐  ┌────────────────────┐     │
│  │    VERSION 1       │  │    VERSION 2  ✨   │     │
│  │    Score: 87%      │  │    Score: 92%      │     │
│  │                    │  │  (AI Recommended)  │     │
│  │ HOOK: "Gue baru.."│  │ HOOK: "Lo masih.." │     │
│  │ FORE: "Yang ke.."  │  │ FORE: "Tapi gue.."│     │
│  │ BODY-1: "Perta.." │  │ BODY-1: "Cara pe.."│     │
│  │ BODY-2: "Kedua.." │  │ BODY-2: "Terus .." │     │
│  │ PEAK: "Ketiga.."  │  │ PEAK: "Dan yang.." │     │
│  │ CTA: "Mau mula.." │  │ CTA: "Comment .."  │     │
│  │ LOOP: "Oh iya.."  │  │ LOOP: "Bentar .."  │     │
│  │                    │  │                    │     │
│  │  [Keep Version 1]  │  │  [Use Version 2 ✨]│     │
│  └────────────────────┘  └────────────────────┘     │
└──────────────────────────────────────────────────────┘

- Full-screen overlay modal (dark backdrop)
- Toggle at top: [Inline | Side-by-Side] — switch between views
- Two scrollable columns, segments shown in compact mode
- Differences highlighted (green = new/better, faded = old)
- Loading state: Right column shows skeleton + "Generating alternative..."
```

---

### 10. ImageStepShell (layout only)

```typescript
// NOTE: ImageStep internals are complex (3000+ lines).
// bolt.new builds ONLY the layout shell. Business logic is wired during integration.

interface ImageStepShellProps {
  // Header
  title: string;
  segmentCount: number;
  imagesGenerated: number;
  onGenerateAll: () => void;
  onRegenerateAll: () => void;
  isGenerating: boolean;
  canGenerate: boolean;             // scriptConfirmed === true

  // View mode
  viewMode: 'full' | 'compact' | 'grid';
  onViewModeChange: (mode: string) => void;

  // Content (actual segment cards rendered by integration code)
  children: React.ReactNode;

  // Navigation
  onPrevStep: () => void;
  onNextStep: () => void;
  canNext: boolean;                 // All images generated
}

// Visual: Same layout concept as current ImageGeneration but WITHOUT sidebar/navbar
// Top: Title + counter ("3/7 images") + [Generate All] button + view mode toggle
// Main: children (segment cards — placeholder cards for bolt.new)
// Bottom: [← Back to Script] [Continue to Video →]
//
// **CRITICAL — 9:16 VERTICAL ASPECT RATIO:**
// ALL image placeholder cards MUST use `aspect-[9/16]` (portrait orientation).
// This is a TikTok/Reels/Shorts video tool — everything is vertical.
// Grid layout: `grid-cols-2 sm:grid-cols-3` with tall vertical cards.
// Each placeholder card: rounded-xl, bg-surface, 9:16 aspect ratio,
//   subtle dashed border when empty, image fills with object-cover when loaded.
// Do NOT use square or landscape placeholders anywhere.
```

---

### 11. VideoStepShell (layout only)

```typescript
interface VideoStepShellProps {
  segmentCount: number;
  videosGenerated: number;
  onGenerateAll: () => void;
  isGenerating: boolean;
  canGenerate: boolean;

  // Pre-Flight Checklist (shown before first generate)
  preFlightItems: PreFlightItem[];
  allPreFlightPassed: boolean;

  // Skeleton Video Preview (shown while generating)
  skeletonSegments: SkeletonVideoSegment[];  // Image + text data for Ken Burns preview

  children: React.ReactNode;        // Segment video cards

  onPrevStep: () => void;
  onNextStep: () => void;
  canNext: boolean;
}

interface SkeletonVideoSegment {
  segmentNumber: number;
  segmentType: string;
  imageUrl: string | null;          // Generated image (from ImageStep)
  scriptText: string;               // Overlay text on the preview
  duration: number;                 // seconds
}
```

**Visual:**
```
┌────────────────────────────────────────────────────────────────────┐
│ Video Generation                                        3/7 done  │
│                                                                    │
│ ┌──────────────── PRE-FLIGHT CHECKLIST ──────────────────────────┐│
│ │ ✈️ Ready to Generate?                                          ││
│ │                                                                ││
│ │ [Hook: ✅ Strong] [Pacing: ✅ Fast] [CTA: ✅ Included]       ││
│ │ [Images: ✅ 7/7]  [Duration: 60s]  [Script: ✅ Confirmed]    ││
│ │                                                                ││
│ │ All checks passed! ✨                    [Generate All ▶]     ││
│ └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│ ┌──── SKELETON VIDEO PREVIEW (shown while generating) ──────────┐│
│ │                                                                ││
│ │  ┌──────────────────┐   Storyboard Preview                    ││
│ │  │                  │                                          ││
│ │  │  9:16 Ken Burns  │   Currently generating: Segment 3 of 7  ││
│ │  │  animated images │   ▓▓▓▓▓▓▓░░░ 43%                       ││
│ │  │  with script     │                                          ││
│ │  │  text overlay    │   The preview auto-plays through all     ││
│ │  │  + segment       │   segments using generated images with   ││
│ │  │  timing          │   Ken Burns pan/zoom + text overlay.     ││
│ │  │                  │   User sees video "coming to life" in    ││
│ │  └──────────────────┘   2 seconds, not after 5 min wait.      ││
│ │                                                                ││
│ └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│ ┌──── SEGMENT VIDEO CARDS (grid) ───────────────────────────────┐│
│ │ children rendered here — 9:16 vertical cards                   ││
│ └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│ [← Back to Images]                            [Continue to Studio →]│
└────────────────────────────────────────────────────────────────────┘

**PRE-FLIGHT CHECKLIST:**
  - Shown as a compact banner at top of VideoStep (before segment cards)
  - Each item: pill badge with status icon + label + detail text
  - Colors: ✅ pass = `bg-emerald-500/10 text-emerald-400`, ⚠️ warn = amber, ❌ fail = red
  - When ALL items pass: banner gets a subtle emerald glow + "All checks passed! ✨"
  - When ANY item fails: [Generate All] button is disabled with tooltip explaining why
  - Collapses to a single line "✈️ Pre-flight: 6/6 ✅" after first successful generate

**SKELETON VIDEO PREVIEW (Zero-Wait — Ken Burns Storyboard):**
  - Shown ONLY while `isGenerating = true` (video generation in progress)
  - 9:16 container, centered, with segment images cycling through:
    - Each image: Ken Burns effect (slow pan + zoom, 3-5s per image)
    - Script text overlay at bottom (white text with dark gradient backdrop)
    - Segment type badge at top-left
    - Smooth crossfade between segments (500ms)
  - Below preview: progress bar + "Currently generating: Segment N of M"
  - Purpose: User sees the video "coming to life" immediately, not after 5+ minutes
  - When individual segments complete: real video replaces Ken Burns for that segment
  - This is the BIGGEST "instant gratification" feature — reduces perceived wait by 90%

**CRITICAL — 9:16 VERTICAL ASPECT RATIO:**
  ALL video placeholder cards MUST use `aspect-[9/16]` (portrait orientation).
  Video previews play inside a 9:16 container with rounded corners.
  Grid layout: `grid-cols-2 sm:grid-cols-3` matching ImageStepShell.
  Each card: 9:16 ratio, play button overlay centered, progress bar at bottom.
  Do NOT use square or 16:9 landscape video containers.
```

---

### 12. StudioStepShell (layout only)

```typescript
interface StudioStepShellProps {
  children: React.ReactNode;        // Remotion Player + timeline placeholder
  onPrevStep: () => void;
  onExport: () => void;
}

// Visual: Full-height workspace
// Top: Preview player — **9:16 portrait** container centered horizontally,
//   max-height: 60vh, with dark bg and subtle rounded corners.
//   Play/pause overlay button centered.
// Bottom: Timeline placeholder (CapCut-style horizontal bars with segment thumbnails)
// Footer: [← Back to Video] [Export ▶]
```

---

### 13. CommandPalette (Global — Ctrl+K / ⌘K)

```typescript
interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteCommand: (command: PaletteCommand) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;

  // Available commands (filtered by context)
  commands: PaletteCommand[];

  // Recent sessions (for quick navigation)
  recentSessions: { orderId: string; title: string; sessionType: string }[];
}

interface PaletteCommand {
  id: string;
  label: string;                 // "Jump to Hook", "Compare Scripts", "Generate All Images"
  shortcut?: string;             // e.g., "⌘+H", "⌘+G"
  icon: string;                  // Lucide icon name
  category: 'navigation' | 'action' | 'session' | 'search';
  description?: string;          // Short helper text
}
```

**Visual:**
```
┌─────────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🔍 Type a command or search...                     ⌘K  │ │  ← Search input (auto-focused)
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ── Quick Actions ──────────────────────────────────────── │
│ ✨ Generate Script                            ⌘+Enter     │
│ 🔄 Regenerate / Compare                      ⌘+R         │
│ 🖼️ Generate All Images                       ⌘+G         │
│ 🎥 Generate All Videos                       ⌘+Shift+G   │
│                                                             │
│ ── Navigation ─────────────────────────────────────────── │
│ 📝 Jump to Hook                              /hook        │
│ 📊 Show Virality Score                       /score       │
│ 🎬 Go to Images Step                         /images      │
│ ⚙️ Open Settings                             /settings    │
│                                                             │
│ ── Recent Sessions ────────────────────────────────────── │
│ ✨ 3 Cara AI Bikin Lo Kaya                   SF-..X7K9    │
│ 🎬 Revolusi UKM! AI ChatBot                 SF-..A3B2    │
│                                                             │
└─────────────────────────────────────────────────────────────┘

  - Triggered by Ctrl+K (Windows) / ⌘K (Mac) globally
  - Full-screen backdrop (bg-black/50) with centered modal (max-w-[560px])
  - Modal: bg-elevated, rounded-xl, shadow-float, border border-border
  - Search input: large (16px), auto-focused, with emerald focus ring
  - Commands filtered as user types (fuzzy matching)
  - Arrow keys to navigate, Enter to execute, Esc to close
  - Command categories: grouped with small section headers
  - Recently used commands float to the top
  - This is the POWER USER feature — keyboard-driven, zero mouse needed
```

---

## Mock Data

```typescript
// Use this mock data to test all components

export const MOCK_SESSIONS: ChatSession[] = [
  {
    orderId: 'SF-20260207-X7K9',
    title: '3 Cara AI Bikin Lo Kaya di 2026',
    sessionType: 'script_gen',
    status: 'script_ready',
    updatedAt: '2026-02-07T10:30:00Z',
    progress: { totalSegments: 7, imagesCompleted: 0, videosCompleted: 0, currentStep: 'script' },
  },
  {
    orderId: 'SF-20260207-A3B2',
    title: 'Revolusi UKM! AI ChatBot Tingkatkan Penjualan',
    sessionType: 'creator_lab',
    status: 'images_ready',
    updatedAt: '2026-02-07T08:15:00Z',
    progress: { totalSegments: 7, imagesCompleted: 5, videosCompleted: 0, currentStep: 'images' },
  },
  {
    orderId: 'SF-20260206-M8N4',
    title: 'Tips Investasi Saham untuk Pemula',
    sessionType: 'creator_lab',
    status: 'video_ready',
    updatedAt: '2026-02-06T14:20:00Z',
    progress: { totalSegments: 7, imagesCompleted: 7, videosCompleted: 3, currentStep: 'video' },
  },
  {
    orderId: 'SF-20260206-Q5R1',
    title: 'Epstein List: Siapa Aja yang Terlibat?',
    sessionType: 'creator_lab',
    status: 'complete',
    updatedAt: '2026-02-06T11:00:00Z',
    progress: { totalSegments: 6, imagesCompleted: 6, videosCompleted: 6, currentStep: 'studio' },
  },
  {
    orderId: 'SF-20260205-P2Q7',
    title: '5 Morning Habits for Productivity',
    sessionType: 'ad_studio',
    status: 'draft',
    updatedAt: '2026-02-05T09:00:00Z',
  },
];

export const MOCK_MENU_ITEMS: MenuItem[] = [
  { id: 'dashboard', icon: 'Home', label: 'Dashboard', path: '/dashboard' },
  { id: 'planner', icon: 'Calendar', label: 'Planner', path: '/planner' },
  { id: 'scriptGen', icon: 'Sparkles', label: 'Script Gen', path: '/script-gen' },
  { id: 'creatorLab', icon: 'Clapperboard', label: 'Creator Lab', path: '/creator-lab' },
  { id: 'adStudio', icon: 'Target', label: 'Ad Studio', path: '/ad-studio' },
  { id: 'gallery', icon: 'Image', label: 'Gallery', path: '/gallery' },
  // Settings is NOT a menu item — it lives in user profile area (sidebar bottom)
];

export const MOCK_HOOK_OPTIONS: HookOptions = {
  option_a_safe: {
    script_text: 'Gue baru nemuin 3 cara AI yang literally bikin passive income.',
    visual_direction:
      'Scene: Creator di coffee shop, tuang kopi | Camera: Medium → Push-in ke wajah | [TEXT POP: "3 CARA AI"] | [SFX: Ding]',
    hook_type: 'curiosity_gap',
  },
  option_b_negative: {
    script_text: 'Lo masih kerja manual di 2026? Ketinggalan parah.',
    visual_direction:
      'Scene: Creator slam laptop tutup | Camera: Close-up slam → Whip-pan ke wajah | [SFX: Boom] | [TEXT POP: "KETINGGALAN"]',
    hook_type: 'negative_controversial',
  },
  option_c_visual: {
    script_text: 'Liat dashboard ini. Semua dari AI.',
    visual_direction:
      '[Camera: Blur → Sharp focus on screen] | Creator tunjuk laptop | [CUT TO: Screen recording dashboard] | [SFX: Cash register]',
    hook_type: 'visual_action',
  },
};

export const MOCK_SEGMENTS: ScriptSegment[] = [
  {
    id: '1',
    segmentNumber: 1,
    segmentType: 'HOOK',
    shotType: 'CREATOR',
    duration: 8,
    script: 'Gue baru nemuin 3 cara AI yang literally bikin passive income.',
    visualDirection:
      'Scene: Creator di coffee shop, tuang kopi | Camera: Medium → Push-in ke wajah | [TEXT POP: "3 CARA AI"] | [SFX: Ding]',
    directorChips: [
      { id: 'c1', type: 'camera', label: 'Medium → Push-in', icon: 'Video', color: 'blue' },
      { id: 'c2', type: 'text_pop', label: '3 CARA AI', icon: 'Type', color: 'pink' },
      { id: 'c3', type: 'sfx', label: 'Ding', icon: 'Volume2', color: 'green' },
    ],
    emotion: 'excited',
    maxWords: 14,
    wordCount: 11,
    isOverLimit: false,
    retentionLevel: 'high',
    needsFix: false,
    isFixing: false,
    estimatedSpeechSeconds: 5.1,   // 11 words / 130 WPM × 60
    waveformFill: 0.64,            // 5.1 / 8 = 0.64 (comfortable — green)
  },
  {
    id: '2',
    segmentNumber: 2,
    segmentType: 'FORE',
    shotType: 'B-ROLL',
    duration: 10,
    script: 'Yang ketiga literally bikin gue quit 9-to-5. Stay sampai akhir.',
    visualDirection:
      '[CUT TO: AI tools dashboard montage] | Camera: Quick-cut sequence | [SFX: Whoosh] | [TEXT POP: "STAY"]',
    directorChips: [
      { id: 'c4', type: 'cut', label: 'CUT TO: Montage', icon: 'Scissors', color: 'orange' },
      { id: 'c5', type: 'camera', label: 'Quick-cut sequence', icon: 'Video', color: 'blue' },
      { id: 'c6', type: 'sfx', label: 'Whoosh', icon: 'Volume2', color: 'green' },
      { id: 'c7', type: 'text_pop', label: 'STAY', icon: 'Type', color: 'pink' },
    ],
    emotion: 'intriguing',
    maxWords: 17,
    wordCount: 12,
    isOverLimit: false,
    retentionLevel: 'medium',
    needsFix: false,
    isFixing: false,
    estimatedSpeechSeconds: 5.5,
    waveformFill: 0.55,            // 5.5 / 10 = 0.55 (green)
  },
  {
    id: '3',
    segmentNumber: 3,
    segmentType: 'BODY-1',
    shotType: 'B-ROLL',
    duration: 10,
    script: 'Pertama: AI copywriting. Jasper bikin 50 artikel sehari.',
    visualDirection:
      '[CUT TO: Screen recording Jasper] | Camera: Zoom-in ke text output | [SFX: Typing] | [TEXT POP: "50 ARTIKEL"]',
    directorChips: [
      { id: 'c8', type: 'cut', label: 'CUT TO: Screen Recording', icon: 'Scissors', color: 'orange' },
      { id: 'c9', type: 'camera', label: 'Zoom-in', icon: 'Video', color: 'blue' },
      { id: 'c10', type: 'sfx', label: 'Typing', icon: 'Volume2', color: 'green' },
      { id: 'c11', type: 'text_pop', label: '50 ARTIKEL', icon: 'Type', color: 'pink' },
    ],
    emotion: 'informative',
    maxWords: 17,
    wordCount: 9,
    isOverLimit: false,
    retentionLevel: 'medium',
    needsFix: false,
    isFixing: false,
    estimatedSpeechSeconds: 4.2,   // 9 words / 130 WPM × 60
    waveformFill: 0.42,            // 4.2 / 10 = 0.42 (comfortable — green)
  },
  {
    id: '4',
    segmentNumber: 4,
    segmentType: 'BODY-2',
    shotType: 'B-ROLL',
    duration: 10,
    script: 'Kedua: AI video. Satu TikTok 10 menit bikin. Hasilnya? 50 juta views.',
    visualDirection:
      '[CUT TO: AI video generation screen] | Camera: Pan across multiple TikTok screens | [SFX: Cha-ching] | [TEXT POP: "50M VIEWS"]',
    directorChips: [
      { id: 'c12', type: 'cut', label: 'CUT TO: AI Video Gen', icon: 'Scissors', color: 'orange' },
      { id: 'c13', type: 'camera', label: 'Pan across screens', icon: 'Video', color: 'blue' },
      { id: 'c14', type: 'sfx', label: 'Cha-ching', icon: 'Volume2', color: 'green' },
      { id: 'c15', type: 'text_pop', label: '50M VIEWS', icon: 'Type', color: 'pink' },
    ],
    emotion: 'surprising',
    maxWords: 17,
    wordCount: 14,
    isOverLimit: false,
    retentionLevel: 'medium',
    needsFix: false,
    isFixing: false,
    estimatedSpeechSeconds: 6.5,   // 14 words / 130 WPM × 60
    waveformFill: 0.65,            // 6.5 / 10 = 0.65 (comfortable — green)
  },
  {
    id: '5',
    segmentNumber: 5,
    segmentType: 'PEAK',
    shotType: 'B-ROLL',
    duration: 10,
    script: 'Ketiga: AI trading bot. Gue pake sendiri. Profit 40% dalam 3 bulan.',
    visualDirection:
      '[CUT TO: Trading dashboard green profit] | Camera: Slow zoom ke profit number | [SFX: Cash register] | [TEXT POP: "+40%"]',
    directorChips: [
      { id: 'c16', type: 'cut', label: 'CUT TO: Trading Dashboard', icon: 'Scissors', color: 'orange' },
      { id: 'c17', type: 'camera', label: 'Slow zoom', icon: 'Video', color: 'blue' },
      { id: 'c18', type: 'sfx', label: 'Cash register', icon: 'Volume2', color: 'green' },
      { id: 'c19', type: 'text_pop', label: '+40%', icon: 'Type', color: 'pink' },
    ],
    emotion: 'mind-blown',
    maxWords: 17,
    wordCount: 14,
    isOverLimit: false,
    retentionLevel: 'high',
    needsFix: false,
    isFixing: false,
    estimatedSpeechSeconds: 6.5,   // 14 words / 130 WPM × 60
    waveformFill: 0.65,            // 6.5 / 10 = 0.65 (comfortable — green)
  },
  {
    id: '6',
    segmentNumber: 6,
    segmentType: 'CTA',
    shotType: 'CREATOR',
    duration: 10,
    script: 'Mau mulai yang mana? Comment 1, 2, atau 3.',
    visualDirection:
      'Scene: Creator sip kopi, relaxed smile | Camera: Medium shot | [TEXT POP: "1, 2, atau 3?"] | [SFX: Notification]',
    directorChips: [
      { id: 'c20', type: 'camera', label: 'Medium shot', icon: 'Video', color: 'blue' },
      { id: 'c21', type: 'text_pop', label: '1, 2, atau 3?', icon: 'Type', color: 'pink' },
      { id: 'c22', type: 'sfx', label: 'Notification', icon: 'Volume2', color: 'green' },
    ],
    emotion: 'friendly',
    maxWords: 17,
    wordCount: 10,
    isOverLimit: false,
    retentionLevel: 'medium',
    needsFix: false,
    isFixing: false,
    estimatedSpeechSeconds: 4.6,   // 10 words / 130 WPM × 60
    waveformFill: 0.46,            // 4.6 / 10 = 0.46 (comfortable — green)
  },
  {
    id: '7',
    segmentNumber: 7,
    segmentType: 'LOOP-END',
    shotType: 'CREATOR',
    duration: 5,
    script: 'Oh iya, gue lupa satu cara lagi...',
    visualDirection:
      'Scene: Creator tuang kopi lagi (mirror HOOK) | Camera: Same angle as HOOK | [SFX: Rewind] | [CUT TO: HOOK start]',
    directorChips: [
      { id: 'c23', type: 'camera', label: 'Same angle as HOOK', icon: 'Video', color: 'blue' },
      { id: 'c24', type: 'sfx', label: 'Rewind', icon: 'Volume2', color: 'green' },
      { id: 'c25', type: 'cut', label: 'CUT TO: HOOK start', icon: 'Scissors', color: 'orange' },
    ],
    emotion: 'teasing',
    maxWords: 9,
    wordCount: 8,
    isOverLimit: false,
    retentionLevel: 'low',
    needsFix: true,                 // LOW retention → shows [✨ Fix] button
    isFixing: false,
    estimatedSpeechSeconds: 3.7,
    waveformFill: 0.74,            // 3.7 / 5 = 0.74 (tight — amber)
  },
];

export const MOCK_SCORE_BREAKDOWN: ScoreBreakdown = {
  hook: { score: 95, status: 'pass' },
  pacing: { score: 90, status: 'pass' },
  density: { score: 75, status: 'warn' },
  cta: { score: 88, status: 'pass' },
  editingCues: { score: 92, status: 'pass' },
};

export const MOCK_NICHES: NicheFilter[] = [
  { id: 'technology', label: 'Technology', icon: 'Cpu', color: 'emerald', topicCount: 8 },
  { id: 'finance', label: 'Finance & Crypto', icon: 'TrendingUp', color: 'amber', topicCount: 5 },
  { id: 'lifestyle', label: 'Lifestyle', icon: 'Heart', color: 'pink', topicCount: 6 },
  { id: 'gaming', label: 'Gaming', icon: 'Gamepad2', color: 'violet', topicCount: 4 },
  { id: 'health', label: 'Health & Fitness', icon: 'Activity', color: 'cyan', topicCount: 3 },
  { id: 'social', label: 'Social Media', icon: 'Share2', color: 'blue', topicCount: 7 },
];

export const MOCK_TOPICS: TopicCard[] = [
  {
    id: 1,
    title: 'Jeffrey Epstein List Terbaru: Nama-nama yang Terlibat',
    description: 'Dokumen pengadilan Epstein yang baru dirilis mengungkap nama-nama mengejutkan. Ini dampaknya buat dunia.',
    hashtags: ['#Epstein', '#Breaking', '#Viral'],
    source: 'google',
    sourceColor: 'bg-blue-500',
    trendingVelocity: 'hot',
    engagementHint: 'Trending #1 on Google',
    thumbnailUrl: null,
    nicheId: null,
  },
  {
    id: 2,
    title: 'AI Trading Bot Bikin 50 Juta dalam 3 Bulan',
    description: 'Gue coba AI trading bot selama 3 bulan. Hasilnya? Profit 40% tanpa sentuh layar.',
    hashtags: ['#AI', '#Trading', '#PassiveIncome'],
    source: 'tiktok',
    sourceColor: 'bg-pink-500',
    trendingVelocity: 'rising',
    engagementHint: '2.1M views on TikTok',
    thumbnailUrl: null,
    nicheId: 'finance',
  },
  {
    id: 3,
    title: 'Mie Gacoan IPO: Peluang Investasi atau Bubble?',
    description: 'Mie Gacoan resmi masuk bursa. Harga saham naik 25% di hari pertama. Worth it gak?',
    hashtags: ['#MieGacoan', '#IPO', '#Saham'],
    source: 'instagram',
    sourceColor: 'bg-violet-500',
    trendingVelocity: 'rising',
    engagementHint: '890K engagement on Instagram',
    thumbnailUrl: null,
    nicheId: 'finance',
  },
  {
    id: 4,
    title: '3 Cara AI Bikin Lo Kaya di 2026',
    description: 'AI tools yang bisa generate passive income tanpa modal gede. Copywriting, Video, Trading.',
    hashtags: ['#AI', '#PassiveIncome', '#2026'],
    source: 'ai',
    sourceColor: 'bg-emerald-500',
    trendingVelocity: 'stable',
    engagementHint: 'AI-suggested based on your niche',
    thumbnailUrl: null,
    nicheId: 'technology',
  },
  {
    id: 5,
    title: 'React 20 Features yang Bikin Developer Gila',
    description: 'Server components, built-in state management, dan auto-optimization. Framework lain ketar-ketir.',
    hashtags: ['#React20', '#WebDev', '#JavaScript'],
    source: 'google',
    sourceColor: 'bg-blue-500',
    trendingVelocity: 'rising',
    engagementHint: 'Trending in Technology',
    thumbnailUrl: null,
    nicheId: 'technology',
  },
  {
    id: 6,
    title: 'Revolusi UKM dengan AI ChatBot: 300% Penjualan',
    description: 'UMKM yang pake AI chatbot rata-rata naik 300% penjualan. Ini toolsnya dan cara setupnya.',
    hashtags: ['#UKM', '#ChatBot', '#AI'],
    source: 'ai',
    sourceColor: 'bg-emerald-500',
    trendingVelocity: 'stable',
    engagementHint: 'AI-suggested for your audience',
    thumbnailUrl: null,
    nicheId: 'technology',
  },
];

export const MOCK_TRENDING_CHIPS: TrendingChip[] = [
  { keyword: 'Epstein List', source: 'google', velocity: 'hot' },
  { keyword: 'AI Trading Bot', source: 'tiktok', velocity: 'rising' },
  { keyword: 'React 20', source: 'google', velocity: 'rising' },
  { keyword: 'Mie Gacoan IPO', source: 'instagram', velocity: 'rising' },
  { keyword: 'Cristiano Ronaldo', source: 'instagram', velocity: 'hot' },
  { keyword: 'GTA 6 Release Date', source: 'google', velocity: 'stable' },
  { keyword: 'Claude AI vs ChatGPT', source: 'tiktok', velocity: 'rising' },
  { keyword: 'Resep Viral TikTok', source: 'tiktok', velocity: 'hot' },
];

export const MOCK_STEPS: StepInfo[] = [
  { id: 'script', label: 'Script', icon: 'FileText', status: 'completed', badge: '7 segments' },
  { id: 'images', label: 'Images', icon: 'Image', status: 'current', badge: '3/7 done' },
  { id: 'video', label: 'Video', icon: 'Film', status: 'locked' },
  { id: 'studio', label: 'Studio', icon: 'Scissors', status: 'locked' },
];

export const MOCK_SIMULATOR_PREVIEW: SimulatorPreview = {
  segmentNumber: 1,
  segmentType: 'HOOK',
  shotType: 'CREATOR',
  duration: 8,
  scriptPreview: 'Gue baru nemuin 3 cara AI yang literally...',
  visualPreview: 'Scene: Creator di coffee shop, tuang kopi | Camera: Medium → Push-in',
  imageUrl: null,   // null = show placeholder with type label
};

export const MOCK_ACTIVE_JOBS: ActiveJob[] = [
  {
    orderId: 'SF-20260207-A3B2',
    title: 'Revolusi UKM! AI ChatBot Tingkatkan Penjualan',
    sessionType: 'creator_lab',
    status: 'images_ready',
    updatedAt: '2026-02-07T08:15:00Z',
    steps: { script: 'completed', images: 'current', video: 'locked', studio: 'locked' },
    totalSegments: 7,
    imagesCompleted: 5,
    videosCompleted: 0,
  },
  {
    orderId: 'SF-20260206-M8N4',
    title: 'Tips Investasi Saham untuk Pemula',
    sessionType: 'creator_lab',
    status: 'video_ready',
    updatedAt: '2026-02-06T14:20:00Z',
    steps: { script: 'completed', images: 'completed', video: 'current', studio: 'locked' },
    totalSegments: 7,
    imagesCompleted: 7,
    videosCompleted: 3,
  },
];

// ── New Mock Data for Master Plan Improvements ──

export const MOCK_VELOCITY_TOPICS: VelocityTopic[] = [
  { keyword: 'AI Trading Bot', velocity: 87, direction: 'up', source: 'tiktok' },
  { keyword: 'Epstein List', velocity: 95, direction: 'up', source: 'google' },
  { keyword: 'React 20', velocity: 72, direction: 'up', source: 'google' },
  { keyword: 'Passive Income', velocity: 65, direction: 'stable', source: 'tiktok' },
  { keyword: 'ChatBot UKM', velocity: 58, direction: 'up', source: 'instagram' },
];

export const MOCK_BRAND_KIT: BrandKit = {
  primaryColor: '#10B981',
  secondaryColor: '#F59E0B',
  toneName: 'Casual & Energetic',
  toneEmoji: '⚡',
  preferredHashtags: ['#AI', '#Viral', '#PassiveIncome', '#TikTok'],
};

export const MOCK_PREFLIGHT_ITEMS: PreFlightItem[] = [
  { id: 'hook', label: 'Hook', status: 'pass', detail: 'Strong' },
  { id: 'pacing', label: 'Pacing', status: 'pass', detail: 'Fast' },
  { id: 'cta', label: 'CTA', status: 'pass', detail: 'Included' },
  { id: 'images', label: 'Images', status: 'pass', detail: '7/7' },
  { id: 'duration', label: 'Duration', status: 'pass', detail: '60s' },
  { id: 'script', label: 'Script', status: 'pass', detail: 'Confirmed' },
];

export const MOCK_COMMANDS: PaletteCommand[] = [
  { id: 'gen-script', label: 'Generate Script', shortcut: '⌘+Enter', icon: 'Sparkles', category: 'action', description: 'Generate a new viral script' },
  { id: 'regen', label: 'Regenerate / Compare', shortcut: '⌘+R', icon: 'RefreshCw', category: 'action', description: 'Create alternative version & compare' },
  { id: 'gen-images', label: 'Generate All Images', shortcut: '⌘+G', icon: 'Image', category: 'action', description: 'Generate images for all segments' },
  { id: 'gen-videos', label: 'Generate All Videos', shortcut: '⌘+Shift+G', icon: 'Film', category: 'action', description: 'Generate videos for all segments' },
  { id: 'go-hook', label: 'Jump to Hook', icon: 'Zap', category: 'navigation', description: 'Scroll to HOOK segment' },
  { id: 'go-score', label: 'Show Virality Score', icon: 'BarChart3', category: 'navigation', description: 'Open virality score breakdown' },
  { id: 'go-images', label: 'Go to Images Step', icon: 'Image', category: 'navigation', description: 'Switch to image generation step' },
  { id: 'settings', label: 'Open Settings', icon: 'Settings', category: 'navigation', description: 'User profile & preferences' },
];
```

---

## What bolt.new Builds vs What We Wire Later

**bolt.new builds (UI only):**
1. `ChatLayout` + `ChatSidebar` — The main shell (with progress status indicators + velocity meter in history)
2. `ChatHome` — Discovery-first home: trending topics FIRST + topic input + Active Jobs + loading overlay
3. `ActiveJobCard` — In-progress session card with mini step progress + progress bar
4. `MultiModalInput` — Image upload drop zone + Link URL input + mode toggle buttons
5. `TrendingTopicsDiscovery` — Live ticker + niche filter bar + search + premium topic cards grid
6. `Workspace` + `StepBar` + `ContextPanel` — **Trinity Power View** (3-column: brain + heart + body)
7. `ScriptStep` — Segment cards + heatmap + director chips + waveform + one-click fix + semantic highlights
8. `HookSelector` — 3-tab hook chooser with tone tinting
9. `ViralityScore` — Score ring + breakdown pills
10. `ScriptComparison` — Inline diff mode (default) + side-by-side modal (toggle)
11. `DirectorChips` — Structured VD tags with color-coded categories + **hover preview animations**
12. `ContextualAITooltip` — Floating action bar on segment focus/text selection
13. `WaveformBar` — Speech timing visualization bar per segment (fill ratio + overflow indicator)
14. `ImageStepShell` — Layout for image generation area (9:16 cards)
15. `VideoStepShell` — Layout + **Pre-Flight Checklist** banner + **Skeleton Video Preview** (Ken Burns)
16. `StudioStepShell` — Layout for timeline editor area (9:16 preview)
17. `CommandPalette` — Global ⌘K modal: quick actions, navigation, session search
18. `TypewriterText` — Reusable component: character-by-character text reveal with cursor (Visual Haptics)

**We wire during integration (NOT for bolt.new):**
- State management (React Context + useReducer)
- Supabase database CRUD
- Edge function API calls
- Authentication (AuthContext)
- Existing 3000+ line ImageGeneration component embedding
- Session persistence & history
