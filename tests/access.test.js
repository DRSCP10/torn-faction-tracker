import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import {
  findAllowedUser,
  isUserAllowed,
  addUser,
  removeUser,
} from '../lib/access.js';

describe('access allowlist', () => {
  it('matches by Torn ID', () => {
    const access = {
      users: [{ id: '345343', name: 'Dwayne' }],
    };
    assert.ok(isUserAllowed(access, { id: '345343', name: 'SomeoneElse' }));
  });

  it('does not allow name-only match without correct ID', () => {
    const access = {
      users: [{ id: '345343', name: 'Dwayne' }],
    };
    assert.equal(isUserAllowed(access, { id: '999', name: 'Dwayne' }), false);
  });

  it('rejects unknown users', () => {
    const access = { users: [{ id: '1', name: 'Alice' }] };
    assert.equal(isUserAllowed(access, { id: '2', name: 'Bob' }), false);
  });

  it('add and remove users', () => {
    const access = { users: [] };
    addUser(access, { id: '345343', name: 'Dwayne', addedBy: 'admin' });
    assert.equal(access.users.length, 1);
    removeUser(access, '345343');
    assert.equal(access.users.length, 0);
  });

  it('prevents duplicate IDs', () => {
    const access = { users: [{ id: '1', name: 'A' }] };
    assert.throws(() => addUser(access, { id: '1', name: 'B' }));
  });
});
