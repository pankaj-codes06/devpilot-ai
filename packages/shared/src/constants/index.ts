export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

export const SUPPORTED_TIMEZONES = [
  'Asia/Kolkata',
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
] as const;

export const DEFAULT_SCHEDULE_CRON = '0 9 * * 1-5'; // Monday to Friday at 09:00 AM
export const DEFAULT_BRANCH_PREFIX = 'devpilot/';
export const DEFAULT_MAX_DAILY_RUNS = 3;

export const DEFAULT_EXCLUDED_PATHS = [
  '.github/**',
  'docker/**',
  'docker-compose.yml',
  '.env*',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  '*.pem',
  '*.key',
];

export const AUTH_COOKIE_NAME = 'devpilot_session';
export const OAUTH_STATE_COOKIE_NAME = 'devpilot_oauth_state';
export const INSTALL_STATE_COOKIE_NAME = 'devpilot_install_state';
export const ACTIVE_ORG_COOKIE_NAME = 'devpilot_active_org';

