import { requireAdmin } from '../../lib/auth.js';
import { readJsonBody } from '../../lib/http.js';
import {
  loadAccessList,
  saveAccessList,
  addUser,
  removeUser,
} from '../../lib/access.js';

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  try {
    if (req.method === 'GET') {
      const access = await loadAccessList();
      res.status(200).json({
        users: access.users || [],
        updatedAt: access.updatedAt,
      });
      return;
    }

    if (req.method === 'POST') {
      const body = await readJsonBody(req);
      const { id, name } = body;
      const access = await loadAccessList();
      addUser(access, { id, name, addedBy: 'admin' });
      await saveAccessList(access);
      res.status(201).json({ ok: true, users: access.users });
      return;
    }

    if (req.method === 'DELETE') {
      const id = req.query?.id || (await readJsonBody(req)).id;
      if (!id) {
        res.status(400).json({ error: 'id required' });
        return;
      }
      const access = await loadAccessList();
      removeUser(access, id);
      await saveAccessList(access);
      res.status(200).json({ ok: true, users: access.users });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Request failed' });
  }
}
