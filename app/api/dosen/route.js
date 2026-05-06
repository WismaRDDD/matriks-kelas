import knex from '@/lib/knex';
import { NextResponse } from 'next/server';

// GET: ambil semua dosen dengan semua field biodata
export async function GET() {
  try {
    const data = await knex('dosen')
      .select(
        'id',
        'f_nidn',
        'f_nip',
        'f_title_depan',
        'f_namapegawai',
        'f_title_belakang',
        'f_tempatlahir',
        'f_tanggallahir',
        'f_jeniskelamin',
        'f_progdi_id',
        'created_at',
        'updated_at'
      )
      .orderBy('id', 'desc');

    return NextResponse.json(data);
  } catch (err) {
    console.error('❌ GET dosen error:', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

// POST: tambah dosen manual
export async function POST(req) {
  try {
    const body = await req.json();

    if (!body.f_namapegawai) {
      return NextResponse.json(
        { error: 'Nama pegawai diperlukan' },
        { status: 400 }
      );
    }

    const result = await knex('dosen').insert({
      f_nidn: body.f_nidn || null,
      f_nip: body.f_nip || null,
      f_title_depan: body.f_title_depan || null,
      f_namapegawai: body.f_namapegawai,
      f_title_belakang: body.f_title_belakang || null,
      f_tempatlahir: body.f_tempatlahir || null,
      f_tanggallahir: body.f_tanggallahir || null,
      f_jeniskelamin: body.f_jeniskelamin || null,
      f_progdi_id: body.f_progdi_id || null,
      prefer_lantai: body.prefer_lantai || null,
      prefer_hari: body.prefer_hari || null,
      avoid_hari: body.avoid_hari || null,
      prefer_jam_mulai: body.prefer_jam_mulai || null,
      prefer_jam_selesai: body.prefer_jam_selesai || null,
    });

    return NextResponse.json({
      success: true,
      id: result[0],
      message: 'Dosen berhasil ditambahkan'
    });
  } catch (err) {
    console.error('❌ POST dosen error:', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

// PUT: update dosen
export async function PUT(req) {
  try {
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json(
        { error: 'ID dosen diperlukan' },
        { status: 400 }
      );
    }

    const dosenExists = await knex('dosen')
      .where({ id: body.id })
      .first();

    if (!dosenExists) {
      return NextResponse.json(
        { error: 'Dosen tidak ditemukan' },
        { status: 404 }
      );
    }

    const updateData = { ...body };
    delete updateData.id;

    // Convert empty strings to null for time fields
    if (updateData.prefer_jam_mulai === '') updateData.prefer_jam_mulai = null;
    if (updateData.prefer_jam_selesai === '') updateData.prefer_jam_selesai = null;
    if (updateData.f_tanggallahir === '') updateData.f_tanggallahir = null;

    await knex('dosen').where({ id: body.id }).update(updateData);

    return NextResponse.json({
      success: true,
      message: 'Dosen berhasil diupdate'
    });
  } catch (err) {
    console.error('❌ PUT dosen error:', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
