import { NextResponse } from 'next/server';

const SESSION_IDLE_TIMEOUT_MS = 5 * 60 * 1000;

function encodeSessionData(data) {
  return btoa(JSON.stringify(data));
}

function decodeSessionData(sessionValue) {
  if (!sessionValue) {
    return null;
  }

  try {
    const decoded = atob(sessionValue);
    const parsed = JSON.parse(decoded);
    return parsed;
  } catch {
    return null;
  }
}

function isSessionIdleExpired(sessionData) {
  const now = Date.now();
  const lastActivityAt = Number(sessionData?.lastActivityAt || sessionData?.createdAt || 0);

  if (!lastActivityAt) {
    return true;
  }

  return now - lastActivityAt > SESSION_IDLE_TIMEOUT_MS;
}

function isValidSessionCookie(sessionValue) {
  const sessionData = decodeSessionData(sessionValue);
  if (!sessionData?.role) {
    return false;
  }

  if (isSessionIdleExpired(sessionData)) {
    return false;
  }

  return true;
}

function buildRefreshedSessionCookie(sessionData) {
  const now = Date.now();
  const refreshed = {
    ...sessionData,
    lastActivityAt: now,
  };

  return encodeSessionData(refreshed);
}

function clearSessionCookie(response) {
  response.cookies.set('session', '', {
    path: '/',
    maxAge: 0,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

function isProtectedPagePath(pathname) {
  return (
    pathname === '/dashboard'
    || pathname.startsWith('/dashboard/')
  );
}

export function middleware(req) {
  const { pathname } = req.nextUrl;
  const isApiPath = pathname.startsWith('/api/');
  const isAuthApiPath = pathname.startsWith('/api/auth/');
  const isProtectedApiPath = isApiPath && !isAuthApiPath;
  const isProtectedPage = isProtectedPagePath(pathname);

  if (!isProtectedApiPath && !isProtectedPage) {
    return NextResponse.next();
  }

  const sessionCookie = req.cookies.get('session')?.value;
  const sessionData = decodeSessionData(sessionCookie);
  if (sessionData && isValidSessionCookie(sessionCookie)) {
    const response = NextResponse.next();

    response.cookies.set('session', buildRefreshedSessionCookie(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/',
    });

    return response;
  }

  const loginUrl = '/login';
  const accept = req.headers.get('accept') || '';
  const wantsHtml = accept.includes('text/html');

  if (isProtectedPage || wantsHtml) {
    const response = NextResponse.redirect(new URL('/login', req.url));
    clearSessionCookie(response);

    return response;
  }

  const response = NextResponse.json(
    {
      error: 'Silahkan login terlebih dahulu',
      loginUrl,
    },
    { status: 401 }
  );

  clearSessionCookie(response);

  return response;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/dashboard',
    '/dashboard/:path*',
  ],
};
