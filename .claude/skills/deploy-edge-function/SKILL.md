---
name: deploy-edge-function
description: Deploy a Supabase Edge Function with pre-deployment validation
disable-model-invocation: true
---

# Deploy Edge Function

Deploy a Supabase Edge Function after validating it exists and compiles.

## Usage

```
/deploy-edge-function <function-name>
```

## Workflow

1. **Validate function exists**: Check that `supabase/functions/<function-name>/index.ts` exists
2. **Check for syntax errors**: Run a quick Deno check on the function file
3. **Confirm with user**: Show the function name and ask for deployment confirmation
4. **Deploy**: Run `supabase functions deploy <function-name>`
5. **Verify**: Check deployment logs for errors with `supabase functions logs <function-name> --limit 5`

## Pre-deployment Checklist

Before deploying, verify:
- [ ] CORS headers are present (check for `corsHeaders` and OPTIONS handler)
- [ ] Environment variables used via `Deno.env.get()` are set as Supabase secrets
- [ ] Response format follows `{ success: true/false, data/error: {...} }`
- [ ] The function imports from `_shared/` use correct relative paths

## Important

- Always ask the user for confirmation before running `supabase functions deploy`
- If the function uses new environment variables, remind the user to set them with `supabase secrets set`
- After deployment, check logs to confirm the function is running correctly
