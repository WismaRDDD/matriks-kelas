import { NextResponse } from 'next/server';
import knex from '@/lib/knex';

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const nidn = url.searchParams.get('nidn');

    if (!nidn) {
      return NextResponse.json(
        { error: 'NIDN parameter required' },
        { status: 400 }
      );
    }

    const dosen = await knex('dosen')
      .where({ f_nidn: nidn })
      .first();

    if (!dosen) {
      return NextResponse.json(
        { error: 'Dosen tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json(dosen);
  } catch (error) {
    console.error('❌ Get dosen error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
