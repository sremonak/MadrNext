#!/usr/bin/env node
// Sandbox/dev shim: Prisma CLI requires a schema-engine binary path when
// PRISMA_SCHEMA_ENGINE_BINARY is set. Networks that block binaries.prisma.sh
// still succeed because `prisma generate` never invokes the binary — it only
// validates that the path exists. Real engine work (migrate) must be done on
// hosts with normal network access, or via `prisma/db/*.sql` bootstrap.
// See docs/DEVELOPMENT.md.
process.exit(0);
