function normalizeKeyword(text) {
  if (!text || typeof text !== "string") return "";

  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s\-_:]/gu, "")
    .trim()
    .toLowerCase();
}

function cleanKeywordList(list = []) {
  const seen = new Set();
  const output = [];

  for (const item of list) {
    const normalized = normalizeKeyword(item);

    if (!normalized) continue;
    if (normalized.length < 2) continue;
    if (seen.has(normalized)) continue;

    seen.add(normalized);
    output.push(normalized);
  }

  return output.sort((a, b) => a.localeCompare(b, "pt-BR"));
}

module.exports = {
  normalizeKeyword,
  cleanKeywordList
};