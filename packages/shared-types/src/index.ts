/**
 * @ori/shared-types — canonical schemas & enums shared between web ↔ api.
 *
 * Treat these as the source of truth for the API contract. When you change
 * a schema here, both the Fastify route and the Next.js client fetch types
 * update in lockstep (imported from this package).
 */

export * from './enums'
export * from './websocket'
