import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    // Create expired cookie to clear session
    const response = NextResponse.json({
      success: true,
      message: 'Logout berhasil',
    });
    
    // Clear the session cookie by setting it with Max-Age=0
    response.headers.append(
      'Set-Cookie',
      'session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax'
    );
    
    return response;
  } catch (error) {
    console.error('❌ Logout error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
