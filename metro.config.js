const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// expo-sqlite's web worker statically imports `wa-sqlite.wasm`. Register `.wasm`
// as an asset so Metro can resolve it when bundling for web. Note: the web runtime
// path actually uses sql.js (see database.ts Platform.OS check + webDatabase.ts);
// this import is pulled in only because database.ts statically imports expo-sqlite.
config.resolver.assetExts.push('wasm');

// Add COOP/COEP headers required by expo-sqlite on web
// (enables SharedArrayBuffer for the OPFS-backed SQLite)
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
      middleware(req, res, next);
    };
  },
};

module.exports = withNativeWind(config, { input: './global.css' });
