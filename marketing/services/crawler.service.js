const { getCache, setCache } = require("../utils/cache");
const { requestTimeoutMs } = require("../config");
const { cleanKeywordList } = require("./cleaner.service");

async function fetchHtml(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ao acessar ${url}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function stripHtml(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(html) {
  const match = html.match(/<title>([\s\S]*?)<\/title>/i);
  return match ? match[1].trim() : "";
}

function extractMetaDescription(html) {
  const match = html.match(/<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']/i);
  return match ? match[1].trim() : "";
}

function extractHeadings(html) {
  const matches = [...html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)];
  return matches.map(m => stripHtml(m[1])).filter(Boolean);
}

function extractTopTerms(text, limit = 30) {
  const words = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .match(/\b[\p{L}\p{N}]{3,}\b/gu) || [];

  const blacklist = new Set([
    "para", "com", "que", "uma", "das", "dos", "por", "sem", "mais",
    "como", "sobre", "este", "essa", "isso", "sua", "seu", "sao",
    "the", "and", "for", "you", "your", "are", "from", "this"
  ]);

  const counter = new Map();

  for (const word of words) {
    if (blacklist.has(word)) continue;
    counter.set(word, (counter.get(word) || 0) + 1);
  }

  return [...counter.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([term, count]) => ({ term, count }));
}

async function analyzeSite(url) {
  const cacheKey = `site:${url}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const html = await fetchHtml(url);
  const text = stripHtml(html);
  const title = extractTitle(html);
  const description = extractMetaDescription(html);
  const headings = extractHeadings(html);
  const topTerms = extractTopTerms(text);

  const keywords = cleanKeywordList([
    title,
    description,
    ...headings,
    ...topTerms.map(item => item.term)
  ]);

  const payload = {
    url,
    title,
    description,
    headings,
    topTerms,
    suggestedKeywords: keywords.slice(0, 50)
  };

  setCache(cacheKey, payload);
  return payload;
}

module.exports = {
  analyzeSite
};