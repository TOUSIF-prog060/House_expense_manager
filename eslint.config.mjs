import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';
import { globalIgnores } from 'eslint/config';

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  globalIgnores(['.next-build/**', '.next/**', 'node_modules/**', 'supabase/functions/**', 'next-env.d.ts']),
];

export default config;
