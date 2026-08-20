import { NextResponse } from 'next/server';
import { createSessionCookie } from '@/lib/auth/session';
import knex from '@/lib/knex';

export async function POST(req) {
  try {
    console.log('🔐 Login request received');
    
    const body = await req.json();
    console.log('📝 Request body:', { role: body.role, username: body.username ? 'provided' : 'none', nidn: body.nidn ? 'provided' : 'none' });
    
    const { role, username, nidn, password } = body;

    // Admin Login
    if (role === 'admin') {
      console.log('👤 Admin login attempt');
      if (username !== 'admin' || password !== 'admin123') {
        console.log('❌ Admin credentials invalid');
        return NextResponse.json(
          { error: 'Username atau password salah' },
          { status: 401 }
        );
      }

      console.log('✅ Admin credentials valid, creating session');
      const cookieString = await createSessionCookie({
        role: 'admin',
        username: 'admin',
        id: 'admin-1',
      });

      const response = NextResponse.json({
        success: true,
        role: 'admin',
        redirect: '/dashboard/admin',
      });
      
      response.headers.append('Set-Cookie', cookieString);
      console.log('✅ Admin session created successfully');
      return response;
    }

    // Dosen Login
    if (role === 'dosen') {
      console.log('👨‍🏫 Dosen login attempt');
      if (!nidn || nidn.toString().trim() === '') {
        console.log('❌ NIDN empty');
        return NextResponse.json(
          { error: 'NIDN tidak boleh kosong' },
          { status: 400 }
        );
      }

      console.log('🔍 Searching for dosen with NIDN:', nidn);
      // Find dosen by NIDN
      const dosen = await knex('dosen')
        .where({ f_nidn: nidn.toString().trim() })
        .first();

      if (!dosen) {
        console.log('❌ NIDN not found in database');
        return NextResponse.json(
          { error: 'NIDN tidak ditemukan di database' },
          { status: 401 }
        );
      }

      console.log('✅ Dosen found:', dosen.f_namapegawai);
      console.log('✅ Creating dosen session');
      // Create session for dosen
      const cookieString = await createSessionCookie({
        role: 'dosen',
        nidn: dosen.f_nidn,
        dosenId: dosen.id,
        nama: dosen.f_namapegawai,
      });

      const response = NextResponse.json({
        success: true,
        role: 'dosen',
        redirect: '/dashboard/dosen',
        dosen: {
          id: dosen.id,
          nidn: dosen.f_nidn,
          nama: dosen.f_namapegawai,
        },
      });
      
      response.headers.append('Set-Cookie', cookieString);
      console.log('✅ Dosen session created successfully');
      return response;
    }

    console.log('❌ Invalid role:', role);
    return NextResponse.json(
      { error: 'Role tidak valid' },
      { status: 400 }
    );
  } catch (error) {
    console.error('❌ Login error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
    });
    
    return NextResponse.json(
      { 
        error: error.message || 'Login failed',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
