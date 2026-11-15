import type { NextConfig } from 'next';
const exported = process.env.STATIC_EXPORT === '1';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
const config: NextConfig = {
  ...(exported ? { output: 'export' as const } : {}),
  basePath,
  trailingSlash: true,
  images: { unoptimized: exported, formats: ['image/avif', 'image/webp'] },
  poweredByHeader: false,
  env: { NEXT_PUBLIC_STATIC_EXPORT: exported ? '1' : '0' },
};
export default config;
