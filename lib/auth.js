import crypto from 'crypto';

const MEMBER_COOKIE = 'faction_member';
const ADMIN_COOKIE = 'faction_admin';

function getSecret() {
  const secret = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!secret) {
    throw new Error('SESSION_SECRET or ADMIN_PASSWORD must be set');
  }
  return secret;
}

function sign(value) {
  return crypto.createHmac('sha256', getSecret()).update(value).digest('hex');
}

function parseCookies(header) {
  if (!header) return {};
  return Object.fromEntries(
    header.split(';').map((c) => {
      const [k, ...v] = c.trim().split('=');
      return [k, decodeURIComponent(v.join('='))];
    })
  );
}

export function createMemberCookie(userId) {
  const id = String(userId);
  const sig = sign(`member:${id}`);
  const maxAge = 60 * 60 * 24 * 30;
  return `${MEMBER_COOKIE}=${id}.${sig}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

export function createAdminCookie() {
  const sig = sign('admin:session');
  const maxAge = 60 * 60 * 24 * 7;
  return `${ADMIN_COOKIE}=${sig}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearAuthCookies() {
  return [
    `${MEMBER_COOKIE}=; Path=/; HttpOnly; Max-Age=0`,
    `${ADMIN_COOKIE}=; Path=/; HttpOnly; Max-Age=0`,
  ];
}

export function verifyMemberCookie(cookieValue) {
  if (!cookieValue) return null;
  const [id, sig] = cookieValue.split('.');
  if (!id || !sig) return null;
  const expected = sign(`member:${id}`);
  if (sig !== expected) return null;
  return id;
}

export function verifyAdminCookie(cookieValue) {
  if (!cookieValue) return false;
  return cookieValue === sign('admin:session');
}

export function isAdmin(req) {
  if (!process.env.ADMIN_PASSWORD) return false;
  const cookies = parseCookies(req.headers.cookie || '');
  return verifyAdminCookie(cookies[ADMIN_COOKIE]);
}

export function getMemberId(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  return verifyMemberCookie(cookies[MEMBER_COOKIE]);
}

export function isMember(req) {
  return Boolean(getMemberId(req));
}

export function isAuthenticated(req) {
  return isAdmin(req) || isMember(req);
}

export function checkAdminPassword(input) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;
  return input === password;
}

export function requireAuth(req, res) {
  if (isAuthenticated(req)) return true;
  res.status(401).json({ error: 'Unauthorized', code: 'login_required' });
  return false;
}

export function requireAdmin(req, res) {
  if (isAdmin(req)) return true;
  res.status(403).json({ error: 'Admin access required', code: 'admin_required' });
  return false;
}

export async function getSessionUser(req) {
  const memberId = getMemberId(req);
  if (!memberId) return null;
  const { loadAccessList, findAllowedUser } = await import('./access.js');
  const access = await loadAccessList();
  const user = (access.users || []).find((u) => String(u.id) === memberId);
  return user ? { id: user.id, name: user.name, role: 'member' } : null;
}
