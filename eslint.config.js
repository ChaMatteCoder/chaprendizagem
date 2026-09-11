import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import hooks from 'eslint-plugin-react-hooks';
import refresh from 'eslint-plugin-react-refresh';

// Start with the new feature and its integration points; legacy modules retain their conventions.
export default [{
  files: ['src/features/iadivinha/**/*.{js,jsx}', 'src/app/App.jsx', 'src/pages/HomePage.jsx', 'src/components/ProjectCard.jsx'],
  languageOptions: {
    ecmaVersion: 'latest', sourceType: 'module', globals: globals.browser,
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
  plugins: { react, 'react-hooks': hooks, 'react-refresh': refresh },
  rules: {
    ...js.configs.recommended.rules,
    'react/jsx-uses-vars': 'error',
    'react/jsx-uses-react': 'error',
    'react/jsx-key': 'error',
    'react/jsx-no-duplicate-props': 'error',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'error',
    'react-refresh/only-export-components': ['error', { allowConstantExport: true }],
  },
}];
