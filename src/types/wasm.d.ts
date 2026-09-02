// Metro resolves `.wasm` imports to an asset (registered via `assetExts` in
// metro.config.js) and hands back an opaque asset-registry id — the value you
// pass to `Asset.fromModule` to get a served, same-origin URL. See
// `src/services/webDatabase.ts`.
declare module '*.wasm' {
  const asset: number;
  export default asset;
}
