import { NextResponse } from 'next/server';
import knex from '@/lib/knex';

export async function GET() {
  const data = await knex('kurikulum_master').orderBy('id', 'desc');
  return NextResponse.json(data);
}

export async function POST(req) {
  try {
    const body = await req.json();

    console.log('DATA MASUK:', body); // 🔥 DEBUG

    const result = await knex('kurikulum_master')
      .insert({
        nama_kurikulum: body.nama_kurikulum,
        tahun_ajaran: body.tahun_ajaran,
      })
      .returning('*'); // 🔥 ambil semua

    console.log('HASIL INSERT:', result);

    return NextResponse.json({ success: true, data: result });

  } catch (err) {
    console.error('ERROR:', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}