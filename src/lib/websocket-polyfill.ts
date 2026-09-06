// Node.js < 22 has no global WebSocket. @supabase/supabase-js constructs a
// RealtimeClient eagerly inside createClient(), which throws
// "Node.js detected but native WebSocket not found" and breaks every server
// function that builds a Supabase client. Provide the implementation from `ws`.
import { WebSocket as NodeWebSocket } from "ws";

if (typeof globalThis.WebSocket === "undefined") {
  (globalThis as { WebSocket?: unknown }).WebSocket = NodeWebSocket;
}
