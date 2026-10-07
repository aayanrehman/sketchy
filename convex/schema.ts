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
  /** Daily cap on paid AI jobs across all rooms. */
  aiBudget: defineTable({ day: v.string(), image: v.number(), judge: v.number() }).index('by_day', ['day']),
});
