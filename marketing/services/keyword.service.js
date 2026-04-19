const { cleanKeywordList } = require("./cleaner.service");
const { getCache, setCache } = require("../utils/cache");
const { requestTimeoutMs, maxKeywordResults } = require("../config");

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0",
        ...(options.headers || {})
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ao consultar ${url}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function generateExpansions(baseKeyword) {
  const base = String(baseKeyword || "").trim();
  if (!base) return [];

  const expansions = [base];

  for (let i = 97; i <= 122; i++) {
    expansions.push(`${base} ${String.fromCharCode(i)}`);
  }

  return expansions;
}

async function googleSuggest(query) {
  const url = `https://suggestqueries.google.com/complete/search?client=firefox&hl=pt-BR&q=${encodeURIComponent(query)}`;
  const data = await fetchWithTimeout(url);
  return Array.isArray(data?.[1]) ? data[1] : [];
}

async function youtubeSuggest(query) {
  const url = `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&hl=pt-BR&q=${encodeURIComponent(query)}`;
  const data = await fetchWithTimeout(url);
  return Array.isArray(data?.[1]) ? data[1] : [];
}

async function collectKeywordSuggestions(baseKeyword, providers = ["google", "youtube"]) {
  const cacheKey = `keywords:${baseKeyword}:${providers.join(",")}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const expansions = generateExpansions(baseKeyword);
  const results = [];

  for (const term of expansions) {
    for (const provider of providers) {
      try {
        let suggestions = [];

        if (provider === "google") {
          suggestions = await googleSuggest(term);
        } else if (provider === "youtube") {
          suggestions = await youtubeSuggest(term);
        }

        for (const item of suggestions) {
          results.push(item);
        }
      } catch (error) {
        console.error(`[marketing][keyword] provider=${provider} term="${term}" erro=${error.message}`);
      }
    }
  }

  const cleaned = cleanKeywordList(results).slice(0, maxKeywordResults);

  const payload = {
    baseKeyword,
    providers,
    total: cleaned.length,
    keywords: cleaned
  };

  setCache(cacheKey, payload);
  return payload;
}

module.exports = {
  collectKeywordSuggestions
};