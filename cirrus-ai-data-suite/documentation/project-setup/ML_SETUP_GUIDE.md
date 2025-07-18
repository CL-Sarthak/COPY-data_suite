# ML Pattern Detection Setup Guide

## Recommended: Google AI Studio (Gemini) - FREE

Google AI Studio provides free access to Gemini models with generous limits perfect for testing.

### Setup Instructions:

1. **Get an API Key**:
   - Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Sign in with your Google account
   - Click "Create API Key"
   - Copy the API key (starts with `AIza...`)

2. **Configure the Application**:
   ```bash
   # Edit your .env.local file
   ML_DETECTION_ENABLED=true
   ML_PROVIDER=vertex
   GOOGLE_CLOUD_API_KEY=your_api_key_here
   ```

3. **Test the Configuration**:
   - Restart the development server: `npm run dev`
   - Navigate to `/ml-test` (only visible in development mode)
   - Enter test text and click "Test ML Detection"

### API Limits (Free Tier):
- 60 requests per minute
- 1,500 requests per day
- No credit card required

## Alternative: OpenAI API

If you have an OpenAI API key, you can modify the mlPatternService.ts to use GPT-4 for entity extraction.

## Alternative: Local Model with Ollama

For completely offline ML:
1. Install [Ollama](https://ollama.ai)
2. Run: `ollama run llama2`
3. Configure:
   ```bash
   ML_PROVIDER=local
   ML_ENDPOINT=http://localhost:11434
   ```

## Troubleshooting

### "API key not working" Error
- Ensure you're using a Google AI Studio API key, not a Google Cloud Platform key
- API keys from Google AI Studio start with `AIza...`
- Check that the API key has not been revoked or expired

### "Rate limit exceeded" Error
- Free tier has limits: 60 RPM, 1,500 RPD
- Consider implementing caching or batching for production use

### No Entities Detected
- The ML model might need clearer examples
- Try text with obvious PII like emails, phone numbers, SSNs