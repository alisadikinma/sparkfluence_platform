/**
 * Platform-Specific Video Ad Specifications
 * For Deno Edge Function compatibility
 * Last updated: 2026-01-20
 */

export default `# Platform-Specific Video Ad Specifications

## Platform Quick Reference

| Platform | Aspect Ratio | Duration | Sound Default | Primary Demo |
|----------|--------------|----------|---------------|--------------|
| TikTok | 9:16 | 21-34s | ON | Gen Z, Millennials |
| Instagram Reels | 9:16 | 15-60s | Variable | Millennials, Gen Z |
| Facebook Feed | 4:5 | 15-60s | OFF | Millennials, Gen X |
| LinkedIn | 4:5 / 1:1 | 15-90s | OFF | Professionals |
| YouTube Skippable | 16:9 | 30-120s | ON | All |
| YouTube Bumper | 16:9 | 6s | ON | All |
| YouTube Shorts | 9:16 | 15-60s | ON | Gen Z, Millennials |

---

## TikTok Configuration

### Technical Specs
| Spec | Value |
|------|-------|
| Aspect Ratio | 9:16 (vertical mandatory) |
| Resolution | 1080 × 1920 px |
| Optimal Duration | 21-34 seconds (280% more conversions) |
| Max Duration | 60 seconds |
| File Size | Up to 500MB |
| Format | MP4, MOV |

### Algorithm Preferences
- **Completion rate** heavily weighted (finish your videos)
- Trending sound usage boosts discovery
- Native editing features/effects preferred
- Creator authenticity over production polish
- Engagement velocity in first hour critical

### Content Best Practices
| Do | Don't |
|----|-------|
| Phone-shot aesthetic | Overly polished/corporate |
| Native TikTok fonts/effects | External watermarks |
| Face-first opening | Logo-first opening |
| Trending sounds | Generic stock music |
| Visual variety every 2-3s | Static shots |
| Text overlays (5-10 wps) | Text-free or wall of text |

### Hook Requirements
**Window:** First 6 seconds make or break

**Effective Hook Formats:**
| Format | Example |
|--------|---------|
| POV | "POV: You just found out..." |
| Comment-response | "Replying to @user who asked..." |
| Secret reveal | "They don't want you to know..." |
| Face-first | Start with face, not product |
| Controversy | "Unpopular opinion:" |

### Sound Strategy
- **93% say sound is essential** to their experience
- Trending audio = algorithmic boost
- Original sounds can trend if compelling
- Voice + music combination performs best

---

## Instagram Reels Configuration

### Technical Specs
| Spec | Value |
|------|-------|
| Aspect Ratio | 9:16 (vertical) |
| Resolution | 1080 × 1920 px |
| Optimal Duration | 15-30s (awareness), 15-60s (consideration) |
| Max Duration | 90 seconds |
| Format | MP4, MOV |

### Differentiation from TikTok
| Factor | TikTok | Instagram Reels |
|--------|--------|-----------------|
| Audience | Younger (18-24) | Older (28-43 median) |
| Polish Level | Lo-fi preferred | Slightly polished OK |
| Purchase Intent | Discovery | Higher intent |
| Shopping | Limited | Strong integration |
| Cross-posting | Native preferred | Avoid TikTok watermarks |

### Content Best Practices
- Visual quality matters more than TikTok
- Brand-forward content acceptable
- Lifestyle integration
- Clean editing (fewer chaotic transitions)
- Product tags for shopping

### Shopping Integration
- Product tags enable one-tap purchase
- "Shop Now" buttons
- Catalog sync for dynamic ads
- AR try-on capabilities

### Algorithm Signals
- Reels shared to Stories get boost
- Saves and shares weighted heavily
- Original audio can rank
- Hashtag strategy still relevant

---

## Facebook Feed Configuration

### Technical Specs
| Spec | Value |
|------|-------|
| Aspect Ratio | 4:5 recommended (claims more screen) |
| Resolution | 1080 × 1350 px (4:5) |
| Optimal Duration | 15-60 seconds |
| Max Duration | 240 minutes (but keep short) |
| Format | MP4, MOV, GIF |

### Sound Strategy
**85% watch muted** - design for sound-off first

| Element | Requirement |
|---------|-------------|
| Captions | Mandatory |
| Text overlays | Key points visible |
| Visual storytelling | Must work without sound |
| Sound enhancement | Bonus, not requirement |

### Content Best Practices
| Converts Well | Doesn't Convert |
|---------------|-----------------|
| UGC-style | Polished corporate |
| Problem-solution format | Pure branding |
| Real testimonials | Stock footage people |
| Before/after | Abstract concepts |
| Face + voice | Faceless voiceover |

### Placement Optimization
| Placement | Aspect | Style |
|-----------|--------|-------|
| Feed | 4:5 | Product-focused, testimonials |
| Reels | 9:16 | Fast-paced, trend-aware |
| Stories | 9:16 | Quick, time-sensitive, personal |

### Algorithm Notes
- Video completion signals quality
- Engagement (comments, shares) weighted
- Watch time over views
- Relevance score affects cost

---

## LinkedIn Configuration

### Technical Specs
| Spec | Value |
|------|-------|
| Aspect Ratio | 4:5 or 1:1 (mobile-optimized) |
| Resolution | 1080 × 1350 px (4:5) or 1080 × 1080 (1:1) |
| Optimal Duration | 15-30s (awareness), 30-90s (consideration) |
| Max Duration | 10 minutes (sponsored), 15 min (native) |
| Format | MP4 |

### Sound Strategy
**80% watch muted** - captions essential

### B2B Content Requirements
| Element | Approach |
|---------|----------|
| Tone | Professional but conversational |
| Authority | Thought leadership integration |
| Targeting | Job title, function, company size |
| Proof | Data-backed claims, case studies |

### High-Performing Content Types
| Type | Description |
|------|-------------|
| How-to tutorials | Practical professional value |
| Industry insights | Data-driven observations |
| Customer success | Named client results |
| Behind-the-scenes | Company culture authenticity |
| Problem identification | "3 mistakes companies make..." |

### Ad Formats
| Format | Use Case |
|--------|----------|
| Sponsored Content | Feed placement, broad reach |
| Thought Leader Ads | Boost employee posts for authenticity |
| Message Ads | Direct outreach, high-intent |
| Conversation Ads | Multi-step engagement |

### Retargeting Impact
Video retargeting influences **53% of SQLs** (Sales Qualified Leads)

---

## YouTube Configuration

### Skippable Pre-Roll Specs
| Spec | Value |
|------|-------|
| Aspect Ratio | 16:9 (horizontal) |
| Resolution | 1920 × 1080 px |
| Optimal Duration | 30-60s (conversion), 60-120s (consideration) |
| Skip Button | Appears at 5 seconds |
| Format | MP4, AVI, MOV |

### First 5 Seconds Critical
- Skip button appears at 5s
- Hook must land immediately
- Include brand early (viewers may skip)
- Front-load the value proposition

### Bumper Ad Specs (6 seconds)
| Spec | Value |
|------|-------|
| Duration | Exactly 6 seconds |
| Skippable | No |
| Best For | Frequency, brand recall |

**Bumper Guidelines:**
- Single message only
- Visual-first design
- Bold imagery
- No builds - hit message immediately
- Designed for repeated exposure

### YouTube Shorts Specs
| Spec | Value |
|------|-------|
| Aspect Ratio | 9:16 (vertical mandatory) |
| Resolution | 1080 × 1920 px |
| Optimal Duration | 15-30 seconds |
| Max Duration | 60 seconds |
| Sound | On by default |

**Shorts Best Practices:**
- Match organic Shorts aesthetic
- Creator-style content
- Quick hooks
- Vertical-native composition
- Trending sounds where appropriate

---

## Cross-Platform Sound Strategy

| Platform | Default | Strategy | Caption Priority |
|----------|---------|----------|------------------|
| Facebook Feed | Muted | Design for sound-off | Essential |
| TikTok | On | Sound-on critical (93%) | Helpful |
| LinkedIn | Muted | Professional VO optional | Essential |
| YouTube Pre-roll | On | Audio integral | Helpful |
| YouTube Shorts | On | Trending audio boost | Helpful |
| Instagram Reels | Variable | Trending audio boost | Recommended |
| Instagram Stories | Variable | Quick consumption | Essential |

### Caption Best Practices
- Sync with speech timing
- High contrast (white text, black outline)
- Large enough for mobile (min 24pt equivalent)
- Positioned in safe zone (not cut off)
- Keyword emphasis with color/bold

---

## Platform Selection by Goal

| Goal | Primary Platform | Secondary |
|------|------------------|-----------|
| Gen Z Awareness | TikTok | YouTube Shorts |
| Millennial B2C | Instagram Reels | Facebook |
| B2B Lead Gen | LinkedIn | YouTube |
| E-commerce Conversion | Facebook | Instagram |
| Brand Building | YouTube | TikTok |
| Retargeting | Facebook | LinkedIn (B2B) |
| Thought Leadership | LinkedIn | YouTube |

---

## Quick Reference: Safe Zones

### Vertical (9:16) Safe Zone
\`\`\`
┌─────────────────────┐
│   [Top 15% unsafe]  │  ← Platform UI elements
│                     │
│   [SAFE CONTENT]    │
│   [SAFE CONTENT]    │
│   [SAFE CONTENT]    │
│                     │
│  [Bottom 20% risky] │  ← CTA buttons, captions
└─────────────────────┘
\`\`\`

### Key Elements Placement
| Element | Position |
|---------|----------|
| Hook text | Upper third |
| Key message | Center |
| CTA | Lower third (above button zone) |
| Logo | Corner (small, non-intrusive) |
`;
