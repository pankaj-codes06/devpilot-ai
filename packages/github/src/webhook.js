import crypto from 'node:crypto';

/**
 * Validates the GitHub webhook signature using timing-safe comparison.
 *
 * @param payload Raw string or buffer of the request body
 * @param signature Header 'x-hub-signature-256' sent by GitHub
 * @param secret Configured webhook secret
 */
export function verifyWebhookSignature(payload, signature, secret) {
  if (!signature || !secret) {
    return false;
  }

  const expectedSignature = `sha256=${crypto
    .createHmac('sha256', secret)
    .update(typeof payload === 'string' ? payload : Buffer.from(payload))
    .digest('hex')}`;

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
}
