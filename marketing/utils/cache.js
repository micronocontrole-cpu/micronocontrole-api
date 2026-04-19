const { cacheTtlMs } = require("../config");

const memoryCache = new Map();

function setCache(key, value, ttl = cacheTtlMs) {
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttl
  });
}

function getCache(key) {
  const item = memoryCache.get(key);

  if (!item) return null;

  if (Date.now() > item.expiresAt) {
    memoryCache.delete(key);
    return null;
  }

  return item.value;
}

function deleteCache(key) {
  memoryCache.delete(key);
}

function clearCache() {
  memoryCache.clear();
}

module.exports = {
  setCache,
  getCache,
  deleteCache,
  clearCache
};