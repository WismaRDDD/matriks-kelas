import knex from '@/lib/knex';
import { NextResponse } from 'next/server';

// GET: ambil semua ruangan
export async function GET() {
  try {
    const data = await knex('ruangan')
      .select('*')
      .orderBy('id', 'desc');

    return NextResponse.json(data);
  } catch (err) {
    console.error('❌ GET ruangan error:', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

// POST: tambah ruangan manual
export async function POST(req) {
  try {
    const body = await req.json();

    if (!body.f_namaruang) {
      return NextResponse.json(
        { error: 'Nama ruangan diperlukan' },
        { status: 400 }
      );
    }

    const result = await knex('ruangan').insert({
      f_ruang_id: body.f_ruang_id || null,
      f_koderuang: body.f_koderuang || null,
      f_namaruang: body.f_namaruang,
      f_kapasitas_kuliah: body.f_kapasitas_kuliah || null,
      f_alamatruang: body.f_alamatruang || null,
      lantai: body.lantai || null,
    });

    return NextResponse.json({
      success: true,
      id: result[0],
      message: 'Ruangan berhasil ditambahkan'
    });
  } catch (err) {
    console.error('❌ POST ruangan error:', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}


// PUT: update ruangan
export async function PUT(req) {
  try {
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json(
        { error: 'ID ruangan diperlukan' },
        { status: 400 }
      );
    }

    const ruanganExists = await knex('ruangan')
      .where({ id: body.id })
      .first();

    if (!ruanganExists) {
      return NextResponse.json(
        { error: 'Ruangan tidak ditemukan' },
        { status: 404 }
      );
    }

    const updateData = { ...body };
    delete updateData.id;

    await knex('ruangan').where({ id: body.id }).update(updateData);

    return NextResponse.json({
      success: true,
      message: 'Ruangan berhasil diupdate'
    });
  } catch (err) {
    console.error('❌ PUT ruangan error:', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}