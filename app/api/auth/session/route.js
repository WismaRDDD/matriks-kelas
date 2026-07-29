import { NextResponse } from 'next/server';
import { decodeSessionValue, getSession } from '@/lib/auth/session';

// Helper untuk parse cookie dari header
function parseCookieHeader(cookieHeader) {
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

export async function GET(req) {
  try {
    let session = await getSession();
    
    // Fallback: try to read from request headers if getSession fails
    if (!session) {
      console.log('Attempting fallback cookie parsing from headers');
      const cookieHeader = req.headers.get('cookie');
      const cookies = parseCookieHeader(cookieHeader);
      
      if (cookies.session) {
        try {
          session = decodeSessionValue(cookies.session);
        } catch (err) {
          console.error('Failed to parse session cookie:', err);
        }
      }
    }
    
    if (!session) {
      const response = NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );

      response.headers.append(
        'Set-Cookie',
        'session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax'
      );

      return response;
    }

    return NextResponse.json({
      authenticated: true,
      session,
    });
  } catch (error) {
    console.error('❌ Session error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
