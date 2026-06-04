import { requireAuth } from './auth.js';
import { isBotAuthed } from './bot-auth.js';

/** Member session cookie or bot secret (x-bot-secret / ?secret=). */
export async function allowMemberOrBot(req, res) {
  if (await isBotAuthed(req)) return true;
  return requireAuth(req, res);
}
