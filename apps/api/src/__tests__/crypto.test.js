import { describe, it, expect } from 'vitest';
import {
  generateRandomState,
  signSessionPayload,
  verifySessionPayload,
} from '../utils/crypto.js';

describe('Crypto & Session Utilities', () => {
  it('generates cryptographically random hex states of correct length', () => {
    const state1 = generateRandomState(16);
    const state2 = generateRandomState(16);

    expect(state1).toHaveLength(32); // 16 bytes = 32 hex chars
    expect(state2).toHaveLength(32);
    expect(state1).not.toEqual(state2);
  });

  it('signs and verifies a valid session payload', () => {
    const payload = { userId: 'user-cuid-123', organizationId: 'org-cuid-456' };
    const token = signSessionPayload(payload);

    expect(token).toContain('.');

    const decoded = verifySessionPayload(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe('user-cuid-123');
    expect(decoded?.organizationId).toBe('org-cuid-456');
  });

  it('rejects tampered session tokens', () => {
    const payload = { userId: 'user-cuid-123', organizationId: 'org-cuid-456' };
    const token = signSessionPayload(payload);

    const [data, sig] = token.split('.');
    const tamperedToken = `${data}a.${sig}`;

    const decoded = verifySessionPayload(tamperedToken);
    expect(decoded).toBeNull();
  });

  it('rejects malformed session tokens', () => {
    expect(verifySessionPayload('')).toBeNull();
    expect(verifySessionPayload('invalid-string-without-dot')).toBeNull();
    expect(verifySessionPayload(undefined)).toBeNull();
  });
});
