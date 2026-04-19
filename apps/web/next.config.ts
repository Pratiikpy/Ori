import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactCompiler: true,
  // `@ori/api` is imported only inside the catchall API route. It's pre-built
  // (via `pnpm --filter @ori/api build` before web builds) so we reference its
  // `./dist/server.js` output — no transpile step needed on the web side.
  transpilePackages: ['@ori/shared-types'],

  // The API route imports Node-only deps (Fastify, Prisma, Redis). Mark them
  // as external server-side packages so they're resolved at runtime, not
  // bundled. Required because fastify ships CJS with dynamic requires.
  serverExternalPackages: [
    'fastify',
    '@fastify/helmet',
    '@fastify/cors',
    '@fastify/rate-limit',
    '@fastify/sensible',
    '@prisma/client',
    'ioredis',
    'pino',
    'pino-pretty',
    'socket.io',
    'graphile-worker',
    '@cosmjs/stargate',
    '@cosmjs/proto-signing',
    '@cosmjs/amino',
    '@cosmjs/encoding',
    '@initia/initia.js',
    'libsodium-wrappers-sumo',
    'bech32',
    'ethers',
    'jsonwebtoken',
    'web-push',
  ],
  experimental: {
    // Preserve original error stack for better dev debugging with InterwovenKit
    serverSourceMaps: true,
  },
  // libsodium-wrappers-sumo ships a broken ESM entry — its .mjs re-imports
  // a sibling `./libsodium-sumo.mjs` that doesn't exist in the package.
  // Force bundlers to pick the CJS entry instead (which ships the core under
  // `modules-sumo/`). Upstream bug, not ours.
  turbopack: {
    resolveAlias: {
      'libsodium-wrappers-sumo':
        'libsodium-wrappers-sumo/dist/modules-sumo/libsodium-wrappers.js',
    },
  },
}

export default nextConfig
