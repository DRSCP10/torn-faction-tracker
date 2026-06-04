import { getBotApiSecret } from './settings.js';

export async function isBotAuthed(req) {
  const secret = await getBotApiSecret();
  if (!secret) return false;
  const key = req.headers['x-bot-secret'] || req.query?.secret;
  return key === secret;
}
