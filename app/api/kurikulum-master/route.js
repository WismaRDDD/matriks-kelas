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
        kode_kurikulum: body.kode_kurikulum,
        nama_kurikulum: body.nama_kurikulum,
        tahun_ajaran: body.tahun_ajaran,
        f_tahun_akademik: body.f_tahun_akademik,
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