import { pgTable, uuid, varchar, text, integer, decimal, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core'

// ============================================================
// USERS — Nutzer mit Rollen (admin / user)
// ============================================================
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  role: varchar('role', { length: 20 }).notNull().default('user'), // 'admin' | 'user'
  language: varchar('language', { length: 5 }).notNull().default('de'), // 'de' | 'en'
  status: varchar('status', { length: 20 }).notNull().default('active'), // 'active' | 'invited' | 'suspended'
  inviteToken: varchar('invite_token', { length: 255 }),
  inviteExpiresAt: timestamp('invite_expires_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  lastLoginAt: timestamp('last_login_at'),
})

// ============================================================
// SESSIONS — Planungs-Sessions (eine pro Brand/Projekt)
// ============================================================
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  brandName: varchar('brand_name', { length: 255 }).notNull(),
  currentModule: varchar('current_module', { length: 50 }).notNull().default('verstehen_01'),
  language: varchar('language', { length: 5 }).notNull().default('de'),
  mode: varchar('mode', { length: 20 }).notNull().default('creative'), // 'creative' | 'inspiration'
  status: varchar('status', { length: 20 }).notNull().default('active'), // 'active' | 'completed' | 'archived'
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
})

// ============================================================
// CONTEXT STORE — Strukturierte Phase-Outputs (JSONB)
// ============================================================
export const contextStore = pgTable('context_store', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => sessions.id, { onDelete: 'cascade' }),
  moduleId: varchar('module_id', { length: 50 }).notNull(),
  outputData: jsonb('output_data').notNull(),
  citations: jsonb('citations'), // Array of Citation objects
  confidenceScore: decimal('confidence_score', { precision: 3, scale: 2 }),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ============================================================
// MESSAGES — Chat-Verlauf pro Session
// ============================================================
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => sessions.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20 }).notNull(), // 'user' | 'assistant' | 'system'
  content: text('content').notNull(),
  moduleId: varchar('module_id', { length: 50 }),
  tokensInput: integer('tokens_input'),
  tokensOutput: integer('tokens_output'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ============================================================
// USAGE EVENTS — Token-Verbrauch für Abrechnung
// ============================================================
export const usageEvents = pgTable('usage_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  sessionId: uuid('session_id').references(() => sessions.id),
  moduleId: varchar('module_id', { length: 50 }),
  model: varchar('model', { length: 50 }).notNull(), // 'claude-sonnet-4-20250514' etc.
  tokensInput: integer('tokens_input').notNull().default(0),
  tokensOutput: integer('tokens_output').notNull().default(0),
  tokensTotal: integer('tokens_total').notNull().default(0),
  costUsd: decimal('cost_usd', { precision: 10, scale: 6 }).notNull().default('0'),
  cached: boolean('cached').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
