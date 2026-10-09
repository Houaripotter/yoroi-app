const ctx = globalThis.__CTX;
const B = {
  isAvailable: true,
  startDiscovery: async () => true,
  stopDiscovery: async () => {},
  sendData: async (p) => { ctx.send(JSON.stringify(p)); return true; },
  getConnectedPeers: async () => ctx.peers(),
  getDeviceName: async () => ctx.name,
  onPeerChanged: (cb) => { ctx.onPeer = cb; return { remove() {} }; },
  onDataReceived: (cb) => { ctx.onData = cb; return { remove() {} }; },
};
module.exports = { __esModule: true, default: B, MultipeerBridge: B };
