// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*'],
  },
  {
    rules: {
      // react/no-unescaped-entities guards against HTML ambiguity in the DOM.
      // This app renders to <Text>, not HTML, so apostrophes and quotes in
      // user-facing copy are unambiguous — escaping them only makes the copy
      // harder to read and edit.
      'react/no-unescaped-entities': 'off',
    },
  },
]);
