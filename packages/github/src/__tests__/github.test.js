import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
  normalizePrivateKey,
  verifyWebhookSignature,
  GitHubOAuthService,
  GitHubAppService,
} from '../index.js';

describe('@devpilot/github — JavaScript Module Verification', () => {
  describe('Private Key Resolution (normalizePrivateKey)', () => {
    it('normalizes literal \\n escapes to real newlines', () => {
      const raw = '-----BEGIN RSA PRIVATE KEY-----\\nMIIEowIBAAKCAQEA...\\n-----END RSA PRIVATE KEY-----';
      const normalized = normalizePrivateKey(raw);
      expect(normalized).toBe(
        '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----'
      );
    });

    it('strips enclosing quotes from environment variables', () => {
      const raw = '"-----BEGIN RSA PRIVATE KEY-----\\nKEY_CONTENT\\n-----END RSA PRIVATE KEY-----"';
      const normalized = normalizePrivateKey(raw);
      expect(normalized).toBe(
        '-----BEGIN RSA PRIVATE KEY-----\nKEY_CONTENT\n-----END RSA PRIVATE KEY-----'
      );
    });

    it('decodes base64-encoded PEM private keys', () => {
      const rawPem = '-----BEGIN RSA PRIVATE KEY-----\nMOCK_KEY_DATA_0987654321\n-----END RSA PRIVATE KEY-----';
      const b64 = Buffer.from(rawPem).toString('base64');
      const normalized = normalizePrivateKey(b64);
      expect(normalized).toBe(rawPem);
    });

    it('resolves key from file path on disk', async () => {
      const tempPath = path.join(os.tmpdir(), `test-key-${Date.now().toString(36)}.pem`);
      const keyData = '-----BEGIN RSA PRIVATE KEY-----\nFILE_KEY_CONTENT\n-----END RSA PRIVATE KEY-----';
      await fs.writeFile(tempPath, keyData, 'utf-8');

      try {
        const normalized = normalizePrivateKey(tempPath);
        expect(normalized).toBe(keyData);
      } finally {
        await fs.unlink(tempPath).catch(() => {});
      }
    });

    it('returns empty string for null or empty keys', () => {
      expect(normalizePrivateKey('')).toBe('');
      expect(normalizePrivateKey(null)).toBe('');
      expect(normalizePrivateKey(undefined)).toBe('');
    });
  });

  describe('Webhook Signature Verification (verifyWebhookSignature)', () => {
    const secret = 'my_secure_webhook_secret_12345';
    const payload = JSON.stringify({ action: 'opened', issue: { number: 42 } });

    it('validates genuine HMAC-SHA256 signature', () => {
      const signature = `sha256=${crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex')}`;

      expect(verifyWebhookSignature(payload, signature, secret)).toBe(true);
    });

    it('rejects tampered signature', () => {
      const signature = 'sha256=0000000000000000000000000000000000000000000000000000000000000000';
      expect(verifyWebhookSignature(payload, signature, secret)).toBe(false);
    });

    it('rejects missing or empty inputs safely without throwing', () => {
      expect(verifyWebhookSignature(payload, undefined, secret)).toBe(false);
      expect(verifyWebhookSignature(payload, '', secret)).toBe(false);
      expect(verifyWebhookSignature(payload, 'sha256=123', '')).toBe(false);
    });
  });

  describe('GitHubOAuthService', () => {
    it('throws when clientId or clientSecret are missing', () => {
      expect(() => new GitHubOAuthService({})).toThrow(/requires clientId and clientSecret/);
      expect(() => new GitHubOAuthService({ clientId: 'id' })).toThrow(/requires clientId and clientSecret/);
    });

    it('generates valid GitHub OAuth login URL with state and scope', () => {
      const oauth = new GitHubOAuthService({
        clientId: 'client-123',
        clientSecret: 'secret-456',
        redirectUri: 'https://app.devpilot.ai/callback',
      });

      const url = oauth.getAuthorizationUrl('random-state-token', 'read:user');
      expect(url).toContain('https://github.com/login/oauth/authorize');
      expect(url).toContain('client_id=client-123');
      expect(url).toContain('redirect_uri=https%3A%2F%2Fapp.devpilot.ai%2Fcallback');
      expect(url).toContain('state=random-state-token');
      expect(url).toContain('scope=read%3Auser');
    });
  });

  describe('GitHubAppService', () => {
    const dummyKey = '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0000000000000000000000000000000000000000\n-----END RSA PRIVATE KEY-----';

    it('throws when appId or privateKey are missing', () => {
      expect(() => new GitHubAppService({})).toThrow(/requires appId and privateKey/);
      expect(() => new GitHubAppService({ appId: 12345 })).toThrow(/requires appId and privateKey/);
    });

    it('instantiates service and formats installation URL', () => {
      const appService = new GitHubAppService({
        appId: 123456,
        privateKey: dummyKey,
        appSlug: 'devpilot-ai',
      });

      const url = appService.getInstallationUrl('secure-install-state');
      expect(url).toBe('https://github.com/apps/devpilot-ai/installations/new?state=secure-install-state');

      const urlWithoutState = appService.getInstallationUrl();
      expect(urlWithoutState).toBe('https://github.com/apps/devpilot-ai/installations/new');
    });
  });
});
