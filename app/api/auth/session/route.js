import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

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
          const decoded = Buffer.from(cookies.session, 'base64').toString('utf-8');
          session = JSON.parse(decoded);
        } catch (err) {
          console.error('Failed to parse session cookie:', err);
        }
      }
    }
    
    if (!session) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
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
