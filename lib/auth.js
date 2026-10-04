// احراز هویت ساده با رمز واحد مدیر (قابل اجرا در Edge و Node)
export const SESSION_COOKIE = 'autodar_session';

export async function sessionToken() {
  const pwd = process.env.ADMIN_PASSWORD || '';
  const salt = process.env.AUTH_SALT || 'autodar';
  const data = new TextEncoder().encode(`${pwd}:${salt}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const authEnabled = () => Boolean(process.env.ADMIN_PASSWORD);
