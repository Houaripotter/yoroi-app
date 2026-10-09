const ctx = globalThis.__CTX;
module.exports = { DeviceEventEmitter: { emit: (e) => { ctx.events.push(e); }, addListener: () => ({ remove() {} }) } };
