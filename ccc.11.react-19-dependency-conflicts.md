# React 19 Dependency Conflicts

**Date**: 2026-01-18
**Status**: Documented, using workaround for MVP

---

## Issue Summary

The Memory Mate MVP uses React 19.1.0, which causes peer dependency conflicts with several packages that have not yet updated their peer dependency ranges to include React 19.x.

### Specific Conflict (Web Dependencies)

When attempting to install `react-native-web` and `react-dom`:

```
Found: react@19.1.0
Could not resolve dependency:
peer react@"^19.2.3" from react-dom@19.2.3
```

The latest `react-dom@19.2.3` requires `react@^19.2.3`, but our project uses `react@19.1.0` (pinned by Expo SDK 54).

### Packages Affected

- `react-dom` - peer dependency mismatch with react@19.1.0
- `nativewind` - previously installed with `--legacy-peer-deps`
- `zustand` - previously installed with `--legacy-peer-deps`

---

## MVP Workaround

For the MVP phase, we're using npm's `--legacy-peer-deps` flag to bypass strict peer dependency resolution:

```bash
npm install react-dom react-native-web --legacy-peer-deps
```

### Why This Is Acceptable for MVP

1. **Functional compatibility** - React 19.1.0 and 19.2.x are minor versions with no breaking API changes
2. **Consistency** - This approach was already used for other packages (nativewind, zustand)
3. **Expo SDK constraint** - React version is pinned by Expo SDK 54; upgrading React independently may cause other issues
4. **Development velocity** - Resolving all conflicts properly would require significant testing and potential package downgrades

### Risks

- Potential for subtle bugs if packages rely on specific React internals
- Warning messages during npm operations
- May mask genuine incompatibilities

---

## Future Resolution Steps

When ready to properly resolve these conflicts (recommended before production release):

### Option A: Wait for Expo SDK Update

1. Monitor Expo SDK releases for React 19.2.x support
2. Run `npx expo upgrade` when a compatible SDK is available
3. Reinstall all packages without `--legacy-peer-deps`
4. Test thoroughly on all platforms

### Option B: Upgrade React Independently

1. Check Expo compatibility matrix for React version support
2. Update `package.json`:
   ```json
   "react": "19.2.3"
   ```
3. Delete `node_modules` and `package-lock.json`
4. Run fresh install: `npm install`
5. Test all functionality:
   - iOS simulator/device
   - Android emulator/device
   - Web browser
   - Hot reload
   - All navigation flows
   - NativeWind styling
   - Zustand state management
   - SQLite database operations

### Option C: Pin Compatible Versions

1. Identify exact compatible versions for all packages
2. Pin versions in `package.json` to avoid auto-upgrades
3. Document version matrix
4. Remove `--legacy-peer-deps` usage

### Verification Checklist (Post-Resolution)

- [ ] `npm install` completes without errors or `--legacy-peer-deps`
- [ ] `npm audit` shows no high/critical vulnerabilities
- [ ] App runs on iOS
- [ ] App runs on Android
- [ ] App runs on Web
- [ ] All styling renders correctly
- [ ] State management works
- [ ] Database operations work
- [ ] No console warnings about React version mismatches

---

## Package Versions at Time of Issue

```json
{
  "react": "19.1.0",
  "react-native": "0.81.5",
  "expo": "~54.0.31",
  "nativewind": "^4.2.1",
  "tailwindcss": "^3.3.2",
  "zustand": "^5.0.10"
}
```

---

## References

- [npm legacy-peer-deps documentation](https://docs.npmjs.com/cli/v8/using-npm/config#legacy-peer-deps)
- [Expo SDK compatibility](https://docs.expo.dev/versions/latest/)
- [React 19 release notes](https://react.dev/blog)

---

**Document Version**: 1.0
**Last Updated**: 2026-01-18
