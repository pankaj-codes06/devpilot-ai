export declare function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string | undefined,
  secret: string
): boolean;
