# ML Production Troubleshooting Guide

## Common Issues and Solutions

### 1. ML Provider Not Being Detected in Production

#### Symptoms:
- ML Indicator shows "No ML Provider" in production
- Environment variables are set in Vercel/deployment platform
- Works locally but not in production

#### Diagnostic Steps:

1. **Check Debug Endpoint** (after deploying the debug route):
   ```bash
   curl https://your-app.vercel.app/api/debug/ml-config
   ```
   This will show:
   - Whether environment variables are being read
   - Current ML service configuration
   - Any configuration mismatches

2. **Check Vercel Logs**:
   - Look for `[MLPatternService] Server-side initialization` logs
   - Check for `[ML Status API] Environment check` logs
   - These show what the service sees at runtime

3. **Verify Environment Variables in Vercel**:
   ```bash
   vercel env ls
   ```
   Ensure these are set:
   - `ML_DETECTION_ENABLED=true`
   - `ML_PROVIDER=vertex`
   - `GOOGLE_CLOUD_API_KEY=AIza...`

#### Common Causes:

1. **Environment Variable Timing**:
   - Next.js may instantiate services before env vars are available
   - Solution: The code now uses `getMLPatternService()` for fresh instances

2. **Variable Name Mismatch**:
   - Check for typos in variable names
   - Vercel is case-sensitive

3. **Deployment Configuration**:
   - Ensure variables are set for the correct environment (Production/Preview/Development)
   - Check if variables need to be encrypted in Vercel

4. **Build vs Runtime**:
   - Some env vars may only be available at runtime, not build time
   - ML service should initialize at runtime (in API routes)

### 2. API Key Not Working

#### Check API Key Format:
- Google AI Studio keys start with `AIza`
- Ensure no extra spaces or newlines
- Test locally first with the same key

#### Test API Key:
```bash
curl -X POST \
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

### 3. SSE Connection Issues

#### Symptoms:
- ML status takes 30-60 seconds to appear
- SSE connections fail in production

#### Solutions:
- The ML indicator now does immediate fallback fetch
- Check Vercel function timeout settings
- Ensure SSE routes have `export const dynamic = 'force-dynamic'`

## Vercel-Specific Configuration

### Required Environment Variables:
```env
ML_DETECTION_ENABLED=true
ML_PROVIDER=vertex
GOOGLE_CLOUD_API_KEY=your_google_ai_studio_key
```

### Function Configuration:
The `vercel.json` sets 60-second timeout for API routes, which should be sufficient for ML operations.

## Testing in Production

1. **Test ML Detection Directly**:
   ```bash
   curl -X POST https://your-app.vercel.app/api/ml/detect \
     -H "Content-Type: application/json" \
     -d '{"text":"John Smith email is john@example.com"}'
   ```

2. **Check ML Status**:
   ```bash
   curl https://your-app.vercel.app/api/ml/status
   ```

3. **Monitor SSE Connection**:
   ```bash
   curl -N https://your-app.vercel.app/api/ml/status/updates
   ```

## Emergency Fallback

If ML detection fails in production:
1. Set `ML_DETECTION_ENABLED=false` to disable ML features
2. The app will fall back to rule-based pattern detection
3. Users will see pattern detection work without ML enhancement