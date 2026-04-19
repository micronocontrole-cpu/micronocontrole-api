const express = require("express");
const { collectKeywordSuggestions } = require("../services/keyword.service");
const { analyzeSite } = require("../services/crawler.service");
const { cleanKeywordList } = require("../services/cleaner.service");
const { analyzeKeywordsWithAI } = require("../services/deepseek.service");

const router = express.Router();

router.get("/health", (req, res) => {
  return res.json({
    ok: true,
    module: "marketing",
    message: "Modulo de marketing ativo"
  });
});

router.post("/keywords/search", async (req, res) => {
  try {
    const { keyword, providers } = req.body || {};

    if (!keyword) {
      return res.status(400).json({ ok: false, error: "keyword e obrigatorio" });
    }

    const result = await collectKeywordSuggestions(
      keyword,
      Array.isArray(providers) && providers.length ? providers : ["google", "youtube"]
    );

    return res.json({ ok: true, data: result });
  } catch (error) {
    console.error("[marketing][route][keywords/search]", error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.post("/list/clean", async (req, res) => {
  try {
    const { items } = req.body || {};

    if (!Array.isArray(items)) {
      return res.status(400).json({ ok: false, error: "items deve ser um array" });
    }

    const cleaned = cleanKeywordList(items);

    return res.json({
      ok: true,
      data: {
        total: cleaned.length,
        items: cleaned
      }
    });
  } catch (error) {
    console.error("[marketing][route][list/clean]", error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.post("/site/analyze", async (req, res) => {
  try {
    const { url } = req.body || {};

    if (!url) {
      return res.status(400).json({ ok: false, error: "url e obrigatoria" });
    }

    const result = await analyzeSite(url);

    return res.json({ ok: true, data: result });
  } catch (error) {
    console.error("[marketing][route][site/analyze]", error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.post("/ai/analyze-keywords", async (req, res) => {
  try {
    const { keywords } = req.body || {};

    if (!Array.isArray(keywords) || !keywords.length) {
      return res.status(400).json({ ok: false, error: "keywords deve ser um array com conteudo" });
    }

    const result = await analyzeKeywordsWithAI(keywords);

    return res.json({ ok: true, data: result });
  } catch (error) {
    console.error("[marketing][route][ai/analyze-keywords]", error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;
