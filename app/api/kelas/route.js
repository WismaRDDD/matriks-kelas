import knex from '@/lib/knex';
import { NextResponse } from 'next/server';

// GET semua kelas
export async function GET() {
  const data = await knex('kelas')
    .leftJoin('kurikulum', 'kelas.f_matkul_id', 'kurikulum.id')
    .select(
      'kelas.*',
      'kurikulum.f_namamk',
      'kurikulum.f_kodemk'
    )
    .orderBy('kelas.id', 'desc');

  return NextResponse.json(data);
}

// POST simpan kelas
export async function POST(req) {
  try {
    const body = await req.json();

    const {
      f_kurikulum,
      f_matkul_id,
      kelasList,
    } = body;

    if (!f_kurikulum || !f_matkul_id || !kelasList.length) {
      return NextResponse.json(
        { error: 'Data tidak lengkap' },
        { status: 400 }
      );
    }

    const insertData = kelasList.map((k) => ({
      f_kurikulum,
      f_matkul_id,
      nama_kelas: k.nama,
      dosen: k.dosen,
    }));

    await knex('kelas').insert(insertData);

    return NextResponse.json({ success: true });

  } catch (err) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

// DELETE kelas
export async function DELETE(req) {
  try {
    const { id } = await req.json();

    await knex('kelas').where({ id }).del();

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

// PUT update dosen kelas
export async function PUT(req) {
  try {
    const { id, dosen } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: 'ID kelas diperlukan' },
        { status: 400 }
      );
    }

    await knex('kelas').where({ id }).update({ dosen });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}