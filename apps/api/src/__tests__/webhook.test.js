import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import { verifyWebhookSignature } from '@devpilot/github';

describe('GitHub Webhook Signature Verification', () => {
  const secret = 'test_webhook_secret_key_123';
  const payload = JSON.stringify({ action: 'created', repository: { name: 'devpilot' } });

  it('validates a correct HMAC-SHA256 signature', () => {
    const signature = `sha256=${crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')}`;

    const isValid = verifyWebhookSignature(payload, signature, secret);
    expect(isValid).toBe(true);
  });

  it('rejects an incorrect signature', () => {
    const signature = 'sha256=abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
    const isValid = verifyWebhookSignature(payload, signature, secret);
    expect(isValid).toBe(false);
  });

  it('rejects when signature or secret is missing', () => {
    expect(verifyWebhookSignature(payload, undefined, secret)).toBe(false);
    expect(verifyWebhookSignature(payload, 'sha256=123', '')).toBe(false);
  });
});
