#!/usr/bin/env node

/**
 * Generate Prisma client in server/node_modules
 * This script reads the root schema, modifies the generator output,
 * generates the client, then cleans up.
 */

import { readFileSync, writeFileSync, accessSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const rootSchemaPath = join(__dirname, '../../prisma/schema.prisma')
const tempSchemaPath = join(__dirname, '../prisma/schema.prisma')

try {
  // Read root schema
  const rootSchema = readFileSync(rootSchemaPath, 'utf-8')
  
  // Modify generator to output to server/node_modules/.prisma/client
  // Output path is relative to schema location (server/prisma/), so we need to go up one level
  const modifiedSchema = rootSchema.replace(
    /generator client \{[\s\S]*?\}/,
    `generator client {
  provider = "prisma-client-js"
  output   = "../node_modules/.prisma/client"
}`
  )
  
  // Ensure server/prisma directory exists
  const prismaDir = join(__dirname, '../prisma')
  try {
    accessSync(prismaDir)
  } catch {
    mkdirSync(prismaDir, { recursive: true })
  }
  
  // Write temporary schema
  writeFileSync(tempSchemaPath, modifiedSchema)
  
  // Generate Prisma client
  console.log('Generating Prisma client for server...')
  execSync(`npx prisma generate --schema="${tempSchemaPath}"`, {
    cwd: join(__dirname, '..'),
    stdio: 'inherit',
  })
  
  console.log('✅ Prisma client generated successfully!')
} catch (error) {
  console.error('❌ Error generating Prisma client:', error.message)
  process.exit(1)
}
