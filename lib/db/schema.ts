import { boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

export const resourceStatus = pgEnum('resource_status', ['candidate', 'source_linked', 'needs_review', 'approved', 'rejected', 'archived'])
export const reviewDecision = pgEnum('review_decision', ['approved', 'rejected', 'needs_changes'])
export const userOccupation = pgEnum('user_occupation', ['teacher', 'parent', 'other'])
export const userYearLevel = pgEnum('user_year_level', ['0-3', '3-5'])

export const sources = pgTable(
  'sources',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    allowedDomains: text('allowed_domains').array().notNull(),
    sourceType: text('source_type').notNull(),
    deepLinksOnly: boolean('deep_links_only').notNull().default(false),
    requiresManualReview: boolean('requires_manual_review').notNull().default(true),
    isEnabled: boolean('is_enabled').notNull().default(true),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('sources_slug_unique').on(table.slug)],
)

export const resources = pgTable(
  'resources',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => sources.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description').notNull(),
    canonicalUrl: text('canonical_url').notNull(),
    thumbnailUrl: text('thumbnail_url'),
    ageStage: text('age_stage').notNull(),
    setting: text('setting').notNull(),
    activityType: text('activity_type').notNull(),
    topic: text('topic').notNull(),
    // Keep this empty unless the exact source activity page declares an EYLF outcome.
    eylfOutcome: text('eylf_outcome'),
    learningArea: text('learning_area').notNull(),
    format: text('format').notNull(),
    materials: text('materials'),
    stepsSummary: text('steps_summary'),
    metadata: jsonb('metadata').$type<Record<string, string | number | boolean | null>>(),
    status: resourceStatus('status').notNull().default('candidate'),
    reviewConfidence: integer('review_confidence'),
    reviewReason: text('review_reason'),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    reviewedBy: text('reviewed_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('resources_canonical_url_unique').on(table.canonicalUrl),
    index('resources_status_index').on(table.status),
    index('resources_source_id_index').on(table.sourceId),
  ],
)

export const resourceReviews = pgTable(
  'resource_reviews',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    resourceId: uuid('resource_id')
      .notNull()
      .references(() => resources.id, { onDelete: 'cascade' }),
    decision: reviewDecision('decision').notNull(),
    notes: text('notes'),
    reviewerId: text('reviewer_id').notNull(),
    aiAssisted: boolean('ai_assisted').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('resource_reviews_resource_id_index').on(table.resourceId)],
)

export const userAccounts = pgTable(
  'user_accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name'),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    occupation: userOccupation('occupation'),
    yearLevel: userYearLevel('year_level'),
    stateTerritory: text('state_territory'),
    country: text('country'),
    onboardingComplete: boolean('onboarding_complete').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('user_accounts_email_unique').on(table.email)],
)

export const userSessions = pgTable(
  'user_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => userAccounts.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('user_sessions_token_hash_unique').on(table.tokenHash), index('user_sessions_user_id_index').on(table.userId)],
)

export const emailVerifications = pgTable(
  'email_verifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => userAccounts.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('email_verifications_token_hash_unique').on(table.tokenHash), index('email_verifications_user_id_index').on(table.userId)],
)

export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => userAccounts.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('password_reset_tokens_token_hash_unique').on(table.tokenHash), index('password_reset_tokens_user_id_index').on(table.userId)],
)

export type ResourceSource = typeof sources.$inferSelect
export type NewResourceSource = typeof sources.$inferInsert
export type VerifiedResource = typeof resources.$inferSelect
export type NewVerifiedResource = typeof resources.$inferInsert
export type ResourceReview = typeof resourceReviews.$inferSelect
export type NewResourceReview = typeof resourceReviews.$inferInsert
export type UserAccount = typeof userAccounts.$inferSelect
export type NewUserAccount = typeof userAccounts.$inferInsert
export type UserSession = typeof userSessions.$inferSelect
export type NewUserSession = typeof userSessions.$inferInsert
export type EmailVerification = typeof emailVerifications.$inferSelect
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect
