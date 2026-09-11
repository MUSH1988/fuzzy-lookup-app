import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client server-side
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', hasGeminiKey: !!process.env.GEMINI_API_KEY });
});

let rateLimitCooldownUntil = 0;

// Live LinkedIn & Company Overview Data Enrichment API via Gemini + Google Search Grounding
app.post('/api/company-enrich', async (req, res) => {
  const { companyName } = req.body;

  if (!companyName || typeof companyName !== 'string' || !companyName.trim()) {
    res.status(400).json({ error: 'Company name is required' });
    return;
  }

  // If rate-limited recently, immediately indicate fallback without attempting call
  if (Date.now() < rateLimitCooldownUntil) {
    res.json({
      success: false,
      rateLimited: true,
      error: 'Gemini API quota currently cooling down. Utilizing verified corporate directory.',
      useFallback: true
    });
    return;
  }

  const ai = getGeminiClient();
  if (!ai) {
    res.json({
      success: false,
      error: 'GEMINI_API_KEY is not configured',
      useFallback: true
    });
    return;
  }

  try {
    const prompt = `Search the web for the official LinkedIn company profile and official business overview for "${companyName.trim()}".
Find the exact and most up-to-date details directly from LinkedIn and company records:
1. "exactEmployeeCount": The exact number of employees / LinkedIn members associated with the company on LinkedIn (as a positive integer, or null if only a range is available).
2. "sizeBracket": The LinkedIn company size bracket (e.g. "10,001+ employees", "5,001-10,000 employees", "1,001-5,000 employees", "501-1,000 employees", "201-500 employees", "51-200 employees", "11-50 employees", "1-10 employees").
3. "industry": The primary official industry classification as shown on their LinkedIn company page.
4. "headquarters": Headquarters city, state/province, and country.
5. "country": The primary country where the company is headquartered.
6. "website": Official company website URL.
7. "linkedinUrl": The official LinkedIn company page URL (e.g. "https://www.linkedin.com/company/...").
8. "source": "LinkedIn" if a verified LinkedIn profile was found, otherwise "Online Overview".

Respond ONLY with a JSON object in this exact format, with no markdown code blocks:
{
  "found": true,
  "companyName": "${companyName.trim()}",
  "exactEmployeeCount": 164000,
  "sizeBracket": "10,001+ employees",
  "industry": "Technology, Information & Internet",
  "headquarters": "Cupertino, CA, United States",
  "country": "United States",
  "website": "https://www.apple.com",
  "linkedinUrl": "https://www.linkedin.com/company/apple",
  "source": "LinkedIn"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: 'You are an accurate corporate data enrichment specialist. Retrieve real, verified LinkedIn and online company overview data for the requested business. Ensure employee count and industry match what is actually published on LinkedIn and official corporate disclosures. Return valid JSON only.'
      }
    });

    const responseText = response.text || '';
    // Extract JSON from response text (handling possible markdown fences)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      res.json({
        success: false,
        error: 'Could not parse structured response from search',
        raw: responseText,
        useFallback: true
      });
      return;
    }

    const parsedData = JSON.parse(jsonMatch[0]);
    res.json({
      success: true,
      data: parsedData
    });
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    const isRateLimit =
      errMsg.includes('429') ||
      errMsg.includes('RESOURCE_EXHAUSTED') ||
      errMsg.includes('quota') ||
      err?.status === 429 ||
      err?.code === 429;

    if (isRateLimit) {
      rateLimitCooldownUntil = Date.now() + 5 * 60 * 1000; // 5-minute cooldown
      console.warn('Gemini API rate/quota limit reached. Cooldown activated; falling back gracefully to verified corporate directory.');
      res.json({
        success: false,
        rateLimited: true,
        error: 'Gemini API quota currently exceeded. Utilizing verified corporate directory.',
        useFallback: true
      });
      return;
    }

    console.warn('Live company search unavailable, using verified database:', errMsg);
    res.json({
      success: false,
      error: errMsg || 'Failed to retrieve live company data',
      useFallback: true
    });
  }
});

// Start Vite middleware or static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
