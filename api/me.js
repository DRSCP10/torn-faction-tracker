import {
  isAuthenticated,
  isAdmin,
  isMember,
  getMemberId,
} from '../lib/auth.js';
import { loadAccessList } from '../lib/access.js';

export default async function handler(req, res) {
  const admin = isAdmin(req);
  const memberId = getMemberId(req);
  let user = null;

  if (memberId) {
    const access = await loadAccessList();
    const allowed = (access.users || []).find((u) => String(u.id) === memberId);
    if (allowed) {
      user = { id: allowed.id, name: allowed.name };
    }
  }

  res.status(200).json({
    authenticated: isAuthenticated(req),
    isAdmin: admin,
    isMember: isMember(req),
    user,
    loginType: admin ? 'admin' : user ? 'member' : null,
    adminConfigured: Boolean(process.env.ADMIN_PASSWORD),
  });
}
