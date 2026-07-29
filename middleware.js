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

function buildUnauthorizedHtml(loginUrl) {
  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Unauthorized</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #f3f6fb, #e6eef9);
      color: #1f2937;
    }

    .card {
      width: min(420px, 92vw);
      background: #ffffff;
      border: 1px solid #dbe3ef;
      border-radius: 14px;
      padding: 28px;
      text-align: center;
      box-shadow: 0 10px 25px rgba(17, 24, 39, 0.08);
    }

    h1 {
      margin: 0 0 12px;
      font-size: 1.25rem;
      font-weight: 700;
    }

    p {
      margin: 0 0 20px;
      color: #4b5563;
    }

    a {
      display: inline-block;
      text-decoration: none;
      background: #2563eb;
      color: #ffffff;
      font-weight: 600;
      padding: 10px 18px;
      border-radius: 10px;
    }

    a:hover {
      background: #1d4ed8;
    }
  </style>
</head>
<body>
  <main class="card">
    <h1>Silahkan login terlebih dahulu</h1>
    <p>Anda belum terautentikasi untuk mengakses endpoint ini.</p>
    <a href="${loginUrl}">Login</a>
  </main>
</body>
</html>`;
}

export function middleware(req) {
  const { pathname, search } = req.nextUrl;

  if (!pathname.startsWith('/api/') || pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  const sessionCookie = req.cookies.get('session')?.value;
  if (isValidSessionCookie(sessionCookie)) {
    const sessionData = decodeSessionData(sessionCookie);
    const response = NextResponse.next();

    if (sessionData) {
      response.cookies.set('session', buildRefreshedSessionCookie(sessionData), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24,
        path: '/',
      });
    }

    return response;
  }

  const fullPath = `${pathname}${search || ''}`;
  const loginUrl = `/login?next=${encodeURIComponent(fullPath)}`;
  const accept = req.headers.get('accept') || '';
  const wantsHtml = accept.includes('text/html');

  if (wantsHtml) {
    const response = new NextResponse(buildUnauthorizedHtml(loginUrl), {
      status: 401,
      headers: {
        'content-type': 'text/html; charset=utf-8',
      },
    });

    response.cookies.set('session', '', {
      path: '/',
      maxAge: 0,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return response;
  }

  const response = NextResponse.json(
    {
      error: 'Silahkan login terlebih dahulu',
      loginUrl,
    },
    { status: 401 }
  );

  response.cookies.set('session', '', {
    path: '/',
    maxAge: 0,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};
