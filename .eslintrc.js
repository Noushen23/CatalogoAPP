module.exports = {
  extends: ['expo', '@react-native'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  rules: {
    // Disable JSX-related errors that are handled by TypeScript
    'react/jsx-uses-react': 'off',
    'react/react-in-jsx-scope': 'off',
  },
};
