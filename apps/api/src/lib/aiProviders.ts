export type AiProvider = 'gemini' | 'openrouter' | 'mistral';

export interface AiKeys {
  gemini?: string;
  openrouter?: string;
  mistral?: string;
}

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let delay = 1000;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      if (i === maxRetries - 1) {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status} - ${errText}`);
      }
    } catch (err) {
      if (i === maxRetries - 1) throw err;
    }
    await new Promise((res) => setTimeout(res, delay));
    delay *= 2;
  }
  throw new Error('Max retries reached');
}

async function callGemini(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const resp = await fetchWithRetry(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { responseMimeType: 'application/json' },
      }),
    }
  );
  const data = await resp.json<{ candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }>();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini no devolvió respuesta válida');
  return text;
}

async function callOpenAiCompatible(
  baseUrl: string,
  model: string,
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const resp = await fetchWithRetry(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    }),
  });
  const data = await resp.json<{ choices?: Array<{ message?: { content?: string } }> }>();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('El proveedor no devolvió respuesta válida');
  return text;
}

async function callProvider(provider: AiProvider, apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  if (provider === 'gemini') return callGemini(apiKey, systemPrompt, userPrompt);
  if (provider === 'openrouter') {
    return callOpenAiCompatible('https://openrouter.ai/api/v1/chat/completions', 'google/gemini-2.0-flash-exp:free', apiKey, systemPrompt, userPrompt);
  }
  return callOpenAiCompatible('https://api.mistral.ai/v1/chat/completions', 'mistral-large-latest', apiKey, systemPrompt, userPrompt);
}

/** Intenta cada proveedor configurado en orden hasta que uno responda. */
export async function generateWithFallback(
  keys: AiKeys,
  order: AiProvider[],
  systemPrompt: string,
  userPrompt: string
): Promise<{ text: string; provider: AiProvider }> {
  const configured = order.filter((p) => keys[p]);
  if (!configured.length) throw new Error('No hay ninguna API key de IA configurada (Gemini, OpenRouter o Mistral)');

  let lastError: Error | null = null;
  for (const provider of configured) {
    try {
      const text = await callProvider(provider, keys[provider] as string, systemPrompt, userPrompt);
      return { text, provider };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastError ?? new Error('Todos los proveedores de IA fallaron');
}
