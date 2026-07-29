// Helper untuk parse cookie dari header
function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  
  cookieHeader.split(';').forEach((cookie) => {
    const [name, value] = cookie.trim().split('=');
    if (name) {
      cookies[name] = decodeURIComponent(value || '');
    }
  });
  
  return cookies;
}

export const SESSION_IDLE_TIMEOUT_MS = 5 * 60 * 1000;

function isSessionIdleExpired(data) {
  const now = Date.now();
  const lastActivityAt = Number(data?.lastActivityAt || data?.createdAt || 0);

  if (!lastActivityAt) {
    return true;
  }

  return now - lastActivityAt > SESSION_IDLE_TIMEOUT_MS;
}

export function decodeSessionValue(sessionValue) {
  if (!sessionValue) {
    return null;
  }

  try {
    const decoded = Buffer.from(sessionValue, 'base64').toString('utf-8');
    const data = JSON.parse(decoded);

    if (!data?.role) {
      return null;
    }

    if (isSessionIdleExpired(data)) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

// Helper untuk create cookie string
function createCookieString(name, value, options = {}) {
  let cookieStr = `${name}=${value}`;
  
  if (options.maxAge) {
    cookieStr += `; Max-Age=${options.maxAge}`;
  }
  if (options.httpOnly) {
    cookieStr += '; HttpOnly';
  }
  if (options.secure) {
    cookieStr += '; Secure';
  }
  if (options.sameSite) {
    cookieStr += `; SameSite=${options.sameSite}`;
  }
  if (options.path) {
    cookieStr += `; Path=${options.path}`;
  }
  
  return cookieStr;
}

export async function createSessionCookie(data) {
  const now = new Date().getTime();
  const sessionData = JSON.stringify({
    ...data,
    createdAt: now,
    lastActivityAt: now,
  });

  // Simple base64 encoding
  const encodedSession = Buffer.from(sessionData).toString('base64');

  const cookieString = createCookieString('session', encodedSession, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });

  return cookieString;
}

// For client-side usage (kept for compatibility)
export async function createSession(data) {
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const now = new Date().getTime();
    const sessionData = JSON.stringify({
      ...data,
      createdAt: now,
      lastActivityAt: now,
    });

    const encodedSession = Buffer.from(sessionData).toString('base64');

    cookieStore.set('session', encodedSession, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
    });

    return true;
  } catch (err) {
    console.error('Error creating session:', err);
    throw err;
  }
}

export async function getSession() {
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const session = cookieStore.get('session');

    if (!session?.value) {
      return null;
    }

    try {
      const data = decodeSessionValue(session.value);
      return data;
    } catch (err) {
      return null;
    }
  } catch (err) {
    console.error('Error getting session:', err);
    return null;
  }
}

export async function destroySession() {
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    cookieStore.delete('session');
    return true;
  } catch (err) {
    console.error('Error destroying session:', err);
    throw err;
  }
}
