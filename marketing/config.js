module.exports = {
  cacheTtlMs: 1000 * 60 * 30, // 30 minutos
  requestTimeoutMs: 15000,
  maxKeywordResults: 100,
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY || "",
    baseUrl: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
    model: process.env.DEEPSEEK_MODEL || "deepseek-chat"
  }
};