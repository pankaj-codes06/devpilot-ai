export class AppError extends Error {
  /**
   * @param {string} message
   * @param {number} [statusCode=400]
   * @param {string} [code='BAD_REQUEST']
   * @param {any} [details]
   */
  constructor(message, statusCode = 400, code = 'BAD_REQUEST', details) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/**
 * Send standard successful API response.
 * @param {import('express').Response} res
 * @param {any} data
 * @param {number} [statusCode=200]
 * @param {Record<string, any>} [meta]
 */
export function sendSuccess(res, data, statusCode = 200, meta) {
  const body = {
    success: true,
    data,
    meta,
  };
  return res.status(statusCode).json(body);
}

/**
 * Send standard error API response.
 * @param {import('express').Response} res
 * @param {string} code
 * @param {string} message
 * @param {number} [statusCode=400]
 * @param {any} [details]
 */
export function sendError(res, code, message, statusCode = 400, details) {
  const body = {
    success: false,
    error: {
      code,
      message,
      details,
    },
  };
  return res.status(statusCode).json(body);
}
