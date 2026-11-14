export interface ParsedMultipart {
  fields: Record<string, string>;
  files: Array<{
    fieldname: string;
    filename: string;
    buffer: Buffer;
    contentType?: string;
  }>;
}

/**
 * Zero-dependency streaming multipart/form-data parser for Node.js / Express.
 */
export function parseMultipartBuffer(
  buffer: Buffer,
  contentTypeHeader: string
): ParsedMultipart {
  const boundaryMatch = contentTypeHeader.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) {
    throw new Error('Multipart request missing boundary header');
  }

  const boundary = boundaryMatch[1] || boundaryMatch[2];
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const endBoundaryBuffer = Buffer.from(`--${boundary}--`);

  const fields: Record<string, string> = {};
  const files: Array<{
    fieldname: string;
    filename: string;
    buffer: Buffer;
    contentType?: string;
  }> = [];

  let start = 0;

  while (start < buffer.length) {
    const boundaryIndex = buffer.indexOf(boundaryBuffer, start);
    if (boundaryIndex === -1) break;

    const nextBoundaryIndex = buffer.indexOf(boundaryBuffer, boundaryIndex + boundaryBuffer.length);
    const partEnd = nextBoundaryIndex === -1 ? buffer.indexOf(endBoundaryBuffer, boundaryIndex) : nextBoundaryIndex;

    if (partEnd === -1) break;

    const partBuffer = buffer.subarray(boundaryIndex + boundaryBuffer.length, partEnd);
    start = nextBoundaryIndex === -1 ? buffer.length : nextBoundaryIndex;

    // Header and body separator in MIME parts: \r\n\r\n (0x0d 0x0a 0x0d 0x0a)
    const headerSep = partBuffer.indexOf('\r\n\r\n');
    if (headerSep === -1) continue;

    const headersText = partBuffer.subarray(0, headerSep).toString('utf-8');
    // Actual body data (strip trailing \r\n if present)
    let bodyBuffer = partBuffer.subarray(headerSep + 4);
    if (bodyBuffer.length >= 2 && bodyBuffer[bodyBuffer.length - 2] === 0x0d && bodyBuffer[bodyBuffer.length - 1] === 0x0a) {
      bodyBuffer = bodyBuffer.subarray(0, bodyBuffer.length - 2);
    }

    const dispMatch = headersText.match(/content-disposition:\s*form-data;\s*([^;\r\n]+(?:;\s*[^;\r\n]+)*)/i);
    if (!dispMatch) continue;

    const dispParams = dispMatch[1]!;
    const nameMatch = dispParams.match(/name="([^"]+)"/i);
    const filenameMatch = dispParams.match(/filename="([^"]+)"/i);

    const ctMatch = headersText.match(/content-type:\s*([^\r\n]+)/i);
    const contentType = ctMatch ? ctMatch[1]?.trim() : undefined;

    if (filenameMatch && filenameMatch[1]) {
      files.push({
        fieldname: nameMatch ? nameMatch[1]! : 'file',
        filename: filenameMatch[1],
        buffer: bodyBuffer,
        contentType,
      });
    } else if (nameMatch && nameMatch[1]) {
      fields[nameMatch[1]] = bodyBuffer.toString('utf-8').trim();
    }
  }

  return { fields, files };
}
