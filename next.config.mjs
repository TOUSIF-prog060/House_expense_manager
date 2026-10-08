import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const config = {
  distDir: process.env.NEXT_PRIVATE_OUTPUT_DIR ?? '.next',
  outputFileTracingRoot: dirname(fileURLToPath(import.meta.url)),
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default config;
