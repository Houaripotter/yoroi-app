const ctx = globalThis.__CTX;
const S = {
  getItem: async (k) => (ctx.kv.has(k) ? ctx.kv.get(k) : null),
  setItem: async (k, v) => { ctx.kv.set(k, String(v)); },
  removeItem: async (k) => { ctx.kv.delete(k); },
};
module.exports = { __esModule: true, default: S };
