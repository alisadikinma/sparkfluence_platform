# Sparkfluence

> AI-Powered Short-Form Video Content Creation Platform

Sparkfluence is a SaaS platform designed to empower content creators, influencers, and digital marketers to generate, plan, and manage viral social media content for TikTok, Instagram, and YouTube. Leveraging cutting-edge AI models with RAG (Retrieval-Augmented Generation), automated visual sourcing, and VEO video generation with built-in voiceover, Sparkfluence streamlines the entire content creation workflow from ideation to publishing.

## ✨ Features

### Core Functionality

- **AI-Powered Topic Generation** - Generate personalized content ideas based on your niche, interests, and objectives using OpenAI GPT-3.5-turbo
- **Creative DNA Profiling** - Assess and define your unique content style and personality
- **RAG-Enhanced Script Generation** - AI-generated viral scripts with knowledge base augmentation (OpenRouter Llama 3.3-70b + Gemini embeddings)
- **Dual-Provider Image Generation** - Choose between HuggingFace FLUX.1-schnell (FREE) or OpenAI DALL-E 3 (Premium) for high-quality visuals
- **VEO 3.1 Video Generation** - Generate professional videos with built-in AI voiceover in multiple languages
- **Multi-Segment Video Editor** - Create 30s-60s videos with structured segments (Hook, Body, Ending, CTA)
- **Visual Content Sourcing** - Automatic image retrieval via Pexels API with regeneration capabilities
- **Music Integration** - Background music selection and mixing for enhanced engagement
- **Content Calendar & Planner** - Schedule and manage content with monthly, weekly, and list views
- **Gallery Management** - Organize and access your created videos
- **Analytics Dashboard** - Track views, engagement, followers, and performance metrics across platforms
- **Token/Credit System** - Manage usage and billing with Indonesian Rupiah support
- **Multi-Platform Support** - Publish to TikTok, Instagram, YouTube, and Meta

### User Experience

- **Comprehensive Onboarding** - Interest selection, profession mapping, and objective setting
- **Google OAuth Integration** - Quick sign-up and login
- **Niche Recommendations** - AI-suggested niches based on user profile
- **Multi-Language Support** - Indonesian Gen-Z style and English content generation
- **Dark Mode UI** - Modern, visually appealing interface with electric purple/pink gradient theme

## 🛠 Tech Stack

### Frontend
- **React 18.2.0** - UI library with functional components and hooks
- **TypeScript** - Type-safe development
- **Vite 6.0.4** - Lightning-fast build tool and dev server
- **React Router DOM 6.8.1** - Client-side routing (25+ routes)
- **Tailwind CSS 3.4.16** - Utility-first styling with custom color system
- **Shadcn UI** - Accessible component library built on Radix UI
- **Radix UI** - Accessible component primitives
- **Lucide React 0.453.0** - Modern icon library

### Backend & Database
- **Supabase** - Backend-as-a-Service
  - **PostgreSQL** - Relational database with 12 migrations
  - **pgvector** - Vector database for RAG (768-dimensional embeddings)
  - **Authentication** - Email/password + Google OAuth
  - **Edge Functions** - 7 Deno/TypeScript serverless functions
  - **Storage** - File storage for images and videos
  - **Real-time** - Live data synchronization
  - **Row-Level Security (RLS)** - Data isolation per user

### AI & APIs
- **OpenAI API** - GPT-3.5-turbo for topic and segment generation
- **OpenRouter API** - Llama 3.3-70b Instruct (FREE tier) for viral script generation
- **Google Gemini API** - text-embedding-004 (FREE) for RAG embeddings
- **HuggingFace API** - FLUX.1-schnell (FREE) for image generation
- **VEO 3.1 API** - Video generation with built-in voiceover (720p, 9:16 vertical)
- **Pexels API** - Free stock image sourcing

### Python Backend
- **FastAPI 0.109.0** - Modern async web framework
- **Uvicorn 0.27.0** - Lightning-fast ASGI server
- **FFmpeg** - Video processing and concatenation
- **httpx 0.26.0** - Async HTTP client for downloads
- **python-dotenv 1.0.0** - Environment variable management

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account
- Python 3.10+ (for backend)
- FFmpeg (for video processing)
- API Keys:
  - OpenAI API key
  - OpenRouter API key (free tier available)
  - Google Gemini API key (free tier available)
  - HuggingFace API key (free tier available)
  - VEO API key
  - Pexels API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd sparkfluence_platform
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Configure Supabase**

   - Set up your Supabase project at [supabase.com](https://supabase.com)
   - Run database migrations from `supabase/migrations/`
   - Configure OAuth providers in Supabase dashboard
   - Create storage buckets: `generated-images`, `final_videos`
   - Deploy Edge Functions:
     ```bash
     supabase functions deploy generate-topics
     supabase functions deploy generate-script
     supabase functions deploy generate-images
     supabase functions deploy generate-videos
     supabase functions deploy check-video-status
     supabase functions deploy generate-video-segments
     supabase functions deploy test-env
     ```

5. **Configure API Keys as Supabase Secrets**

   ```bash
   supabase secrets set OPENAI_API_KEY=sk-...
   supabase secrets set OPENROUTER_API_KEY=sk-or-v1-...
   supabase secrets set GEMINI_API_KEY=AIza...
   supabase secrets set HUGGINGFACE_API_KEY=hf_...
   supabase secrets set VEO_API_KEY=...
   supabase secrets set PEXELS_API_KEY=...
   ```

6. **Set up Python Backend (Optional for full video assembly)**

   ```bash
   cd backend
   pip install -r requirements.txt
   ```

   Create `backend/.env`:
   ```env
   SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   BACKEND_API_KEY=your_secure_random_key
   ```

### Development

Start the frontend development server:
```bash
npm run dev
```

Start the Python backend (in separate terminal):
```bash
cd backend
uvicorn main:app --reload
```

The application will be available at `http://localhost:5173`
The backend API will be available at `http://localhost:8000`

### Build

Create a production build:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## 📁 Project Structure

```
sparkfluence_platform/
├── src/
│   ├── components/              # Reusable UI components
│   │   ├── ui/                 # Shadcn UI components (Button, Card, Input, etc.)
│   │   └── WelcomeModal.tsx    # First login welcome modal
│   ├── contexts/               # React Context providers
│   │   ├── AuthContext.tsx            # Authentication state management (95 lines)
│   │   ├── OnboardingContext.tsx      # Onboarding flow data (79 lines)
│   │   └── PlannerContext.tsx         # Content planner state (211 lines)
│   ├── screens/                # Application screens (29 total)
│   │   ├── Landing/            # Marketing landing page (715 lines)
│   │   ├── Login/              # Login screen (226 lines)
│   │   ├── Register/           # Registration screen (267 lines)
│   │   ├── Welcome/            # First login welcome (78 lines)
│   │   ├── PackageSelection/   # Plan selection (223 lines)
│   │   ├── Onboarding/         # Multi-step setup (342 lines)
│   │   ├── NicheRecommendations/ # AI niche suggestions (316 lines)
│   │   ├── CreativeDNA/        # Creative style profiling (431 lines)
│   │   ├── AvatarUpload/       # Avatar upload (184 lines)
│   │   ├── AvatarPreview/      # Avatar preview
│   │   ├── ContentCuration/    # Content strategy setup (371 lines)
│   │   ├── TopicSelection/     # AI topic picker (211 lines)
│   │   ├── VideoEditor/        # Multi-segment video editor (403 lines)
│   │   ├── MusicSelector/      # Background music selection (223 lines)
│   │   ├── Loading/            # Loading state screen
│   │   ├── FullVideo/          # Full video assembly (328 lines)
│   │   ├── FullVideoPreview/   # Preview final video
│   │   ├── Dashboard/          # Main dashboard with metrics (372 lines)
│   │   ├── Gallery/            # Video library (267 lines)
│   │   ├── Planner/            # Content calendar (8.2K total)
│   │   │   └── views/          # MonthlyView, WeeklyView, ListView
│   │   └── Settings/           # User settings (40K total)
│   │       ├── Settings.tsx
│   │       ├── PaymentModal.tsx
│   │       ├── PlanBilling.tsx
│   │       └── TokenPurchase.tsx
│   ├── lib/
│   │   ├── supabase.ts         # Supabase client configuration
│   │   └── utils.ts            # Utility functions
│   └── index.tsx               # Main app entry point with routing
├── supabase/
│   ├── functions/              # Edge Functions (Deno/TypeScript)
│   │   ├── generate-topics/            # AI topic generation (175 lines)
│   │   ├── generate-script/            # RAG-enhanced script gen (166 lines)
│   │   ├── generate-images/            # FLUX/DALL-E image gen (181 lines)
│   │   ├── generate-videos/            # VEO 3.1 video gen (190 lines)
│   │   ├── check-video-status/         # VEO status polling (119 lines)
│   │   ├── generate-video-segments/    # 8-segment structure (265 lines)
│   │   └── test-env/                   # Environment validation (96 lines)
│   └── migrations/             # Database schema migrations (12 files)
├── backend/                    # Python FastAPI backend
│   ├── main.py                 # FastAPI server (387 lines)
│   └── requirements.txt        # Python dependencies
├── docs/
│   └── n8n/                    # RAG knowledge pipeline
│       ├── chunk_and_embed.py          # Embedding generation script
│       ├── requirements.txt            # Python dependencies
│       ├── api_contracts.md            # API documentation
│       └── supabase_vector_schema.sql  # Vector DB schema
├── public/                     # Static assets (logos, icons)
├── package.json                # npm dependencies
├── tailwind.config.js          # Tailwind CSS configuration
├── vite.config.ts              # Vite build configuration
├── tsconfig.json               # TypeScript configuration
├── CLAUDE.md                   # Developer guide for AI assistants
└── README.md                   # This file
```

## 🗄 Database Schema

### Key Tables (12 Migrations)

- **auth.users** - Supabase authentication users (managed by Supabase Auth)
- **user_profiles** - Extended user profile data
  - `first_login` - Track first login for welcome modal
  - `onboarding_completed` - Onboarding flow completion status
- **videos** - Video metadata and content
- **video_segments** - Individual video segment data
  - Scripts, visual prompts, image URLs, video URLs
  - 8-segment structure: Hook, Foreshadow, Body (x3-4), Ending, CTA
- **planned_content** - Scheduled content calendar entries
  - Multi-platform scheduling
  - Draft/scheduled/published status
  - Video data and final URLs
- **user_tokens** - Token/credit balance tracking
- **token_purchases** - Purchase history and transaction logs
- **social_media_analytics** - Performance metrics per platform
  - Views, engagement, likes, comments, shares, saves
  - Follower tracking, reach, impressions
  - Watch time and engagement rates
- **analytics_summary** - Aggregated analytics data
- **knowledge_embeddings** - RAG vector store (pgvector)
  - 768-dimensional embeddings from Gemini text-embedding-004
  - Project type tagging (viral_script, image_video)
  - RPC function: `match_knowledge()` for similarity search

All user-specific tables implement Row-Level Security (RLS) policies for data isolation.

## 🔌 API Documentation

### Supabase Edge Functions

#### 1. Generate Topics
**Endpoint:** `/functions/v1/generate-topics`

Generates 5 personalized topic suggestions using OpenAI GPT-3.5-turbo.

**Request Body:**
```json
{
  "interest": "technology",
  "profession": "software engineer",
  "platform": "tiktok",
  "objective": "growth",
  "niche": "tech tutorials",
  "creativeStyle": "educational"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "topics": [
      {
        "title": "10 VS Code Extensions That Changed My Life",
        "description": "Quick tutorial on productivity-boosting extensions"
      }
      // ... 4 more topics
    ]
  }
}
```

#### 2. Generate Script (RAG-Enhanced)
**Endpoint:** `/functions/v1/generate-script`

Creates viral scripts using OpenRouter Llama 3.3-70b with RAG knowledge augmentation.

**Request Body:**
```json
{
  "input_type": "topic",
  "content": "10 VS Code Extensions That Changed My Life",
  "duration": "30s",
  "platform": "tiktok",
  "language": "indonesian"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "segments": [
      {
        "type": "HOOK",
        "duration_seconds": 6,
        "script_text": "Lo tau gak 10 extension VS Code ini literally changed my life...",
        "visual_direction": "Enthusiastic developer at computer, VS Code visible",
        "emotion": "shock"
      }
      // ... more segments (BODY_1, BODY_2, ENDING_CTA)
    ],
    "metadata": {
      "virality_score": 8.5,
      "hooks_used": ["curiosity_gap"],
      "total_duration": 30,
      "language": "indonesian"
    }
  }
}
```

#### 3. Generate Images
**Endpoint:** `/functions/v1/generate-images`

Generates images using HuggingFace FLUX.1-schnell (FREE) or OpenAI DALL-E 3 (Premium).

**Request Body:**
```json
{
  "segments": [
    {
      "type": "HOOK",
      "script_text": "...",
      "visual_direction": "...",
      "emotion": "shock"
    }
  ],
  "style": "cinematic",
  "aspect_ratio": "9:16",
  "provider": "huggingface"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "images": [
      {
        "segment_type": "HOOK",
        "prompt": "Cinematic photography. Enthusiastic developer...",
        "image_url": "https://supabase.co/storage/.../generated.png",
        "provider": "huggingface",
        "revised_prompt": null
      }
    ],
    "provider": "huggingface"
  }
}
```

#### 4. Generate Videos (VEO 3.1)
**Endpoint:** `/functions/v1/generate-videos`

Generates videos with built-in AI voiceover using VEO 3.1.

**Request Body:**
```json
{
  "segments": [...],
  "images": [...],
  "language": "indonesian"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "videos": [
      {
        "segment_type": "HOOK",
        "veo_response": {
          "id": 12345,
          "uuid": "abc123...",
          "model_name": "veo-3.1-fast",
          "status": 1,
          "status_percentage": 0,
          "estimated_credit": 5
        }
      }
    ],
    "polling_endpoint": "/functions/v1/check-video-status",
    "polling_interval_seconds": 5
  }
}
```

#### 5. Check Video Status
**Endpoint:** `/functions/v1/check-video-status`

Polls VEO API for video generation status.

**Request Body:**
```json
{
  "video_uuids": ["abc123...", "def456..."]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "videos": [
      {
        "uuid": "abc123...",
        "segment_type": "HOOK",
        "status": 2,
        "video_url": "https://veo-cdn.com/.../video.mp4"
      }
    ],
    "summary": {
      "total": 4,
      "completed": 2,
      "processing": 1,
      "failed": 1
    }
  }
}
```

### Python Backend API

#### POST /api/combine-final-video
Combines video segments with FFmpeg and optional background music.

**Request Headers:**
```
x-api-key: your_backend_api_key
Content-Type: application/json
```

**Request Body:**
```json
{
  "project_id": "uuid-here",
  "segments": [
    {
      "type": "HOOK",
      "video_url": "https://...",
      "duration_seconds": 8
    }
  ],
  "options": {
    "bgm_url": "https://music.com/track.mp3",
    "bgm_volume": 0.15
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "job_id": "job_abc123",
    "status": "processing",
    "estimated_time_seconds": 30,
    "polling_endpoint": "/api/job-status/job_abc123"
  }
}
```

#### GET /api/job-status/{job_id}
Get status of video combination job.

**Response:**
```json
{
  "success": true,
  "data": {
    "job_id": "job_abc123",
    "status": "completed",
    "progress_percentage": 100,
    "current_step": "Upload complete",
    "final_video_url": "https://supabase.co/storage/.../final.mp4",
    "metadata": {
      "duration_seconds": 32.5,
      "file_size_mb": 15.3,
      "resolution": "720x1280",
      "format": "mp4",
      "codec": "h264"
    }
  }
}
```

## 🎨 Design System

### Color Palette (Tailwind)

```js
colors: {
  'electric-purple': '#7c3aed',
  'pink': '#ec4899',
  'charcoal': '#1e1e1e',
  'app-bg-dark': '#0a0a0a',
  'card-bg-dark': '#1a1a1a',
  'header-bg-dark': '#111111',
  'elevation-1': 'rgba(255, 255, 255, 0.05)',
  'elevation-2': 'rgba(255, 255, 255, 0.08)',
  'elevation-3': 'rgba(255, 255, 255, 0.12)',
}
```

### Typography

```js
fontFamily: {
  sans: ['Inter', 'system-ui', 'sans-serif'],
  display: ['Poppins', 'sans-serif'],
  mono: ['JetBrains Mono', 'monospace'],
}
```

## 📝 Development Guidelines

### Code Style

- Use TypeScript for type safety
- Follow React best practices (functional components, hooks)
- Use Tailwind CSS utility classes for styling
- Implement proper error handling with try-catch blocks
- Use React Context for global state management
- Follow RLS (Row-Level Security) best practices

### Component Patterns

```tsx
// Example component structure
import React from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  title: string;
  onAction: () => void;
}

export const ExampleComponent: React.FC<Props> = ({ title, onAction }) => {
  return (
    <div className="p-4 bg-card-bg-dark rounded-lg">
      <h2 className="text-xl font-bold text-white">{title}</h2>
      <Button onClick={onAction}>Click Me</Button>
    </div>
  );
};
```

### Authentication Pattern

```tsx
import { useAuth } from '@/contexts/AuthContext';

const MyComponent = () => {
  const { user, signIn, signOut } = useAuth();

  if (!user) {
    return <div>Please sign in</div>;
  }

  return <div>Welcome, {user.email}</div>;
};
```

## 🚢 Deployment

### Deploying to Production

1. **Build the frontend**
   ```bash
   npm run build
   ```

2. **Deploy to hosting platform**
   ```bash
   # Vercel (recommended)
   vercel --prod

   # Or Netlify
   netlify deploy --prod
   ```

3. **Configure environment variables** on your hosting platform
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

4. **Deploy Supabase Edge Functions**
   ```bash
   supabase functions deploy generate-topics
   supabase functions deploy generate-script
   supabase functions deploy generate-images
   supabase functions deploy generate-videos
   supabase functions deploy check-video-status
   supabase functions deploy generate-video-segments
   supabase functions deploy test-env
   ```

5. **Deploy Python Backend**
   ```bash
   # Railway, Render, or DigitalOcean
   # Ensure FFmpeg is installed on the server
   ```

### Environment Variables for Production

**Frontend:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**Supabase Secrets:**
- `OPENAI_API_KEY`
- `OPENROUTER_API_KEY`
- `GEMINI_API_KEY`
- `HUGGINGFACE_API_KEY`
- `VEO_API_KEY`
- `PEXELS_API_KEY`

**Python Backend:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `BACKEND_API_KEY`

## 🔧 Troubleshooting

### Common Issues

**Issue: Supabase connection errors**
- Verify `.env` file contains correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Check Supabase project status in dashboard

**Issue: Edge Functions not working**
- Ensure functions are deployed: `supabase functions deploy <function-name>`
- Verify API keys are set as secrets: `supabase secrets list`
- Check function logs: `supabase functions logs <function-name>`

**Issue: OAuth login not working**
- Configure OAuth providers in Supabase dashboard (Authentication > Providers)
- Add authorized redirect URLs for your domain

**Issue: Images not loading**
- Verify `HUGGINGFACE_API_KEY` or `OPENAI_API_KEY` is set correctly
- Check API rate limits
- Ensure storage bucket `generated-images` exists with public access

**Issue: Video generation failing**
- Check `VEO_API_KEY` is valid
- Ensure 2-second delay between requests (rate limiting)
- Verify `check-video-status` function is polling correctly

**Issue: FFmpeg errors in backend**
- Ensure FFmpeg is installed: `ffmpeg -version`
- Check video URLs are accessible
- Verify sufficient disk space in `/tmp`

## 🗺 Roadmap

### Upcoming Features
- **Script Lab** - Advanced script editing tools with A/B testing
- **Visual Forge** - Custom visual content creation and editing
- **Video Genie** - Enhanced video generation with custom animations
- **AI Chat** - Conversational AI assistant for content ideation
- **Insight** - Advanced analytics and performance recommendations
- **Community** - Creator collaboration and content sharing features
- **Team Collaboration** - Multi-user workflows and approval processes
- **Auto-Publishing** - Direct publishing to social media platforms via APIs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

## 💬 Support

For support, please contact the development team or open an issue in the repository.

For detailed developer documentation, see [CLAUDE.md](CLAUDE.md).

---

**Built with ❤️ for content creators worldwide**

**Version:** 1.0.0
**Last Updated:** 2025-12-07
**Latest Commit:** d8e04d0 - Refactor Supabase functions with VEO integration, RAG support, and free-tier AI APIs
