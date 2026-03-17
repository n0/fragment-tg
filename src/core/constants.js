export const BASE_URL = 'https://fragment.com';
export const API_PATH = '/api';
export const HASH_REGEX = /"apiUrl":"\\\/api\?hash=([a-f0-9]+)"/;

export const DEFAULT_HEADERS = {
  'Accept': 'application/json, text/javascript, */*; q=0.01',
  'Content-Type': 'application/x-www-form-urlencoded',
  'X-Requested-With': 'XMLHttpRequest',
  'X-Aj-Referer': 'https://fragment.com/',
  'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
};

export const POLL_INTERVAL_MS = 700;
export const MAX_POLL_ATTEMPTS = 120;
export const HASH_TTL_MS = 300_000; // 5 minutes
