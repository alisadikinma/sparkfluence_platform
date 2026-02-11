---
name: new-edge-function
description: Scaffold a new Supabase Edge Function with project boilerplate
disable-model-invocation: true
---

# New Edge Function

Scaffold a new Supabase Edge Function with the Sparkfluence project's standard boilerplate.

## Usage

```
/new-edge-function <function-name>
```

## Arguments

- `function-name` (required): The name of the edge function in kebab-case (e.g., `generate-music`, `fetch-user-data`)

## Workflow

1. **Validate name**: Ensure kebab-case, no spaces, no uppercase
2. **Check if exists**: Verify `supabase/functions/<function-name>/index.ts` does not already exist
3. **Ask options**:
   - Does this function need API key rotation? (Yes/No)
   - Does this function need Supabase client access? (Yes/No — almost always Yes)
   - Is this a public endpoint (no JWT)? (Yes/No — almost always No)
4. **Create the function**: Generate `supabase/functions/<function-name>/index.ts` with the boilerplate below
5. **Remind**: Tell the user to deploy with `/deploy-edge-function <function-name>` when ready

## Boilerplate Template

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// If API key rotation needed:
// import { callWithRotationHybrid, callOpenRouterHybrid } from "../_shared/apiKeyRotation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth: Extract user token
    const authHeader = req.headers.get("authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user (remove if public endpoint)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body = await req.json();
    // TODO: Validate body fields

    // TODO: Implement function logic

    return new Response(
      JSON.stringify({ success: true, data: {} }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[FUNCTION_NAME] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Unknown error",
        },
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

## Conventions

- Response format: `{ success: true, data: {...} }` or `{ success: false, error: { code, message } }`
- Error codes: SCREAMING_SNAKE_CASE (e.g., `UNAUTHORIZED`, `VALIDATION_ERROR`, `RATE_LIMITED`)
- Secrets: Always use `Deno.env.get()` — never hardcode keys
- Imports: Use `https://esm.sh/` for npm packages, relative paths for `_shared/`
- CORS: Every function MUST have the corsHeaders and OPTIONS handler
- API keys: Use `callWithRotationHybrid` from `_shared/apiKeyRotation.ts` instead of raw env keys for LLM calls
