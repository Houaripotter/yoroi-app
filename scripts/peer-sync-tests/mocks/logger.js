const ctx = globalThis.__CTX;
const l = (lvl) => (...a) => { if (process.env.VERBOSE || lvl==='error') console.log(`[${ctx.name}] ${lvl}`, ...a.map(x => x instanceof Error ? x.message : (typeof x==='object'? JSON.stringify(x):x))); ctx.logs.push([lvl, a.map(String).join(' ')]); };
module.exports = { __esModule: true, default: { info: l('info'), warn: l('warn'), error: l('error'), debug: () => {} } };
