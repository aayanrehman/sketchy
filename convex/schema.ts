import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  /** One document per room: the whole engine state (see engine.ts), minus sketch strokes. */
  rooms: defineTable({ code: v.string(), isDemo: v.boolean(), state: v.any(), lastActivity: v.number() })
    .index('by_code', ['code'])
    .index('by_lastActivity', ['lastActivity']),
  /** Sketch strokes (and the PNG sent to the AI) live apart from the room so the room doc stays small. */
  sketches: defineTable({
    roomId: v.id('rooms'), gameId: v.string(), round: v.number(), playerId: v.string(),
    strokes: v.any(), png: v.optional(v.string()),
  }).index('by_roomId_and_round_and_playerId', ['roomId', 'round', 'playerId']),
  /** High-churn heartbeats, kept off the room document. */
  presence: defineTable({ roomId: v.id('rooms'), playerId: v.string(), lastSeen: v.number() })
    .index('by_roomId_and_playerId', ['roomId', 'playerId']),
  /** One scored prompt-mode final per player per round, keyed by a per-device id (no login). Powers challenges and crew boards. */
  attempts: defineTable({
    deviceId: v.string(), name: v.string(), targetId: v.string(), day: v.string(),
    kind: v.union(v.literal('daily'), v.literal('challenge'), v.literal('party'), v.literal('solo')),
    /** Daily: only the first counted attempt of the day feeds streaks and crew boards. */
    counts: v.boolean(),
    score: v.number(), prompt: v.string(), imageUrl: v.optional(v.string()),
    breakdown: v.optional(v.object({ subject: v.number(), details: v.number(), style: v.number(), color: v.number(), composition: v.number() })),
    code: v.string(), gameId: v.string(), playerId: v.string(), challengeId: v.optional(v.id('attempts')),
  }).index('by_deviceId_and_day', ['deviceId', 'day'])
    .index('by_code_and_gameId_and_playerId', ['code', 'gameId', 'playerId'])
    .index('by_targetId_and_score', ['targetId', 'score']),
  /** Friends without accounts: a crew is a code plus the devices in it. */
  crews: defineTable({
    code: v.string(), name: v.string(),
    members: v.array(v.object({ deviceId: v.string(), name: v.string(), joinedAt: v.number() })),
  }).index('by_code', ['code']),
  /** Daily cap on paid AI jobs across all rooms. */
  aiBudget: defineTable({ day: v.string(), image: v.number(), judge: v.number() }).index('by_day', ['day']),
});
