import knex from '@/lib/knex';
import { NextResponse } from 'next/server';

// GET: ambil semua tahun akademik
export async function GET() {
  try {
    const data = await knex('tahun_akademik')
      .select('*')
      .orderBy('tahun_awal', 'desc');

    return NextResponse.json(data);
  } catch (err) {
    console.error('❌ GET tahun_akademik error:', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

// POST: tambah tahun akademik
export async function POST(req) {
  try {
    const body = await req.json();

    if (!body.tahun_awal) {
      return NextResponse.json(
        { error: 'Tahun awal diperlukan' },
        { status: 400 }
      );
    }

    if (!/^\d{4}$/.test(String(body.tahun_awal))) {
      return NextResponse.json(
        { error: 'Tahun awal harus berupa angka 4 digit' },
        { status: 400 }
      );
    }

    const tahun_awal = parseInt(body.tahun_awal);
    const tahun_akhir = tahun_awal + 1;
    const tahun_akademik = `${tahun_awal}/${tahun_akhir}`;

    // Cek duplikat
    const exists = await knex('tahun_akademik')
      .where({ tahun_akademik })
      .first();

    if (exists) {
      return NextResponse.json(
        { error: 'Tahun akademik sudah ada' },
        { status: 400 }
      );
    }

    const result = await knex('tahun_akademik').insert({
      tahun_awal,
      tahun_akhir,
      tahun_akademik,
    });

    return NextResponse.json({
      success: true,
      id: result[0],
      message: 'Tahun akademik berhasil ditambahkan',
      data: { id: result[0], tahun_awal, tahun_akhir, tahun_akademik }
    });
  } catch (err) {
    console.error('❌ POST tahun_akademik error:', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

// PUT: update tahun akademik
export async function PUT(req) {
  try {
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json(
        { error: 'ID tahun akademik diperlukan' },
        { status: 400 }
      );
    }

    const tahunExists = await knex('tahun_akademik')
      .where({ id: body.id })
      .first();

    if (!tahunExists) {
      return NextResponse.json(
        { error: 'Tahun akademik tidak ditemukan' },
        { status: 404 }
      );
    }

    if (body.tahun_awal && !/^\d{4}$/.test(String(body.tahun_awal))) {
      return NextResponse.json(
        { error: 'Tahun awal harus berupa angka 4 digit' },
        { status: 400 }
      );
    }

    let updateData = { ...body };
    delete updateData.id;

    if (body.tahun_awal) {
      const tahun_awal = parseInt(body.tahun_awal);
      const tahun_akhir = tahun_awal + 1;
      updateData.tahun_awal = tahun_awal;
      updateData.tahun_akhir = tahun_akhir;
      updateData.tahun_akademik = `${tahun_awal}/${tahun_akhir}`;
    }

    await knex('tahun_akademik').where({ id: body.id }).update(updateData);

    return NextResponse.json({
      success: true,
      message: 'Tahun akademik berhasil diupdate'
    });
  } catch (err) {
    console.error('❌ PUT tahun_akademik error:', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
