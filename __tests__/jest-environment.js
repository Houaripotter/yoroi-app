// Custom Jest environment that sets window.location before jest-expo setup runs
const NodeEnv = require('jest-environment-node').TestEnvironment;

class YoroiTestEnvironment extends NodeEnv {
  customExportConditions = ['require', 'react-native'];

  constructor(config, context) {
    super(config, context);
    // Set up window.location before any setup files run
    // jest-expo sets global.window = global, so we need location on global
    // Mock WebSocket for metro HMR client
    this.global.WebSocket = class WebSocket {
      constructor() {
        this.readyState = 0;
        this.onopen = null;
        this.onclose = null;
        this.onmessage = null;
        this.onerror = null;
      }
      send() {}
      close() {}
      addEventListener() {}
      removeEventListener() {}
    };

    // Mock document for expo HMR
    if (!this.global.document) {
      this.global.document = {
        currentScript: null,
        createElement: function() { return {}; },
        createTextNode: function() { return {}; },
        getElementById: function() { return null; },
        querySelector: function() { return null; },
        querySelectorAll: function() { return []; },
        addEventListener: function() {},
        removeEventListener: function() {},
      };
    }

    this.global.location = {
      protocol: 'http:',
      hostname: 'localhost',
      port: '8081',
      host: 'localhost:8081',
      href: 'http://localhost:8081',
      pathname: '/',
      search: '',
      hash: '',
      origin: 'http://localhost:8081',
      assign: function() {},
      reload: function() {},
      replace: function() {},
      toString: function() { return 'http://localhost:8081'; },
    };
  }
}

module.exports = YoroiTestEnvironment;
