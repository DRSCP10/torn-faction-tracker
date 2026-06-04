import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildHitsReportRows,
  summarizeHitsReport,
  attackDirection,
} from '../lib/hits-report.js';

describe('hits report', () => {
  it('classifies incoming stealth vs outgoing hit', () => {
    const attacks = {
      out: {
        attacker_id: 1,
        attacker_name: 'Alice',
        attacker_faction: 99,
        defender_faction: 0,
        defender_name: 'Bob',
        result: 'Hospitalized',
        respect_gain: 3,
        stealthed: 0,
        started: 2000,
      },
      inc: {
        attacker_id: '',
        attacker_name: '',
        stealthed: 1,
        defender_id: 2,
        defender_name: 'Victim',
        defender_faction: 99,
        attacker_faction: '',
        result: 'Mugged',
        respect_gain: 1,
        started: 1000,
      },
    };
    const members = { 1: { name: 'Alice' }, 2: { name: 'Victim' } };
    const rows = buildHitsReportRows(attacks, members, 99);
    assert.equal(rows.length, 2);
    const outgoing = rows.find((r) => r.result === 'Hospitalized');
    const incoming = rows.find((r) => r.result === 'Mugged');
    assert.equal(outgoing.direction, 'Our attack');
    assert.equal(outgoing.countsAsOffensiveHit, true);
    assert.equal(incoming.direction, 'Attacked us (stealth)');
    assert.equal(incoming.attacker, 'Someone');
    assert.equal(incoming.countsAsOffensiveHit, false);
  });

  it('summarizes result counts', () => {
    const rows = [
      { result: 'Mugged', countsAsOffensiveHit: true, direction: 'Our attack', stealthed: false },
      { result: 'Lost', countsAsOffensiveHit: false, direction: 'Our attack', stealthed: false },
      { result: 'Stalemate', countsAsOffensiveHit: false, direction: 'Attacked us', stealthed: false },
    ];
    const s = summarizeHitsReport(rows);
    assert.equal(s.total, 3);
    assert.equal(s.offensiveHits, 1);
    assert.equal(s.byResult.Mugged, 1);
    assert.equal(s.byResult.Lost, 1);
  });

  it('detects attacked us direction', () => {
    assert.equal(
      attackDirection(
        { defender_faction: 99, defender_id: 1, attacker_faction: 0 },
        99,
        { 1: { name: 'X' } }
      ),
      'Attacked us'
    );
  });
});
