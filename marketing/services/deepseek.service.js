const { deepseek, requestTimeoutMs } = require("../config");
const { getCache, setCache } = require("../utils/cache");

async function callDeepSeek(messages) {
  if (!deepseek.apiKey) {
    throw new Error("DEEPSEEK_API_KEY nao configurada");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch(`${deepseek.baseUrl}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${deepseek.apiKey}`
      },
      body: JSON.stringify({
        model: deepseek.model,
        messages,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content || "";
  } finally {
    clearTimeout(timeout);
  }
}

async function analyzeKeywordsWithAI(keywords = []) {
  const cacheKey = `deepseek:keywords:${JSON.stringify(keywords)}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const prompt = `
Analise a lista de keywords abaixo em portugues do Brasil.
Retorne em JSON com este formato:
{
  "clusters": [
    {
      "intent": "informacional|comercial|transacional|navegacional",
      "keywords": ["..."],
      "summary": "..."
    }
  ],
  "contentIdeas": ["..."],
  "priorityKeywords": ["..."]
}

Keywords:
${keywords.join(", ")}
  `.trim();

  const content = await callDeepSeek([
    {
      role: "system",
      content: "Voce e um analista de SEO e marketing digital. Responda apenas JSON valido."
    },
    {
      role: "user",
      content: prompt
    }
  ]);

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    parsed = {
      raw: content
    };
  }

  setCache(cacheKey, parsed);
  return parsed;
}

module.exports = {
  callDeepSeek,
  analyzeKeywordsWithAI
};
