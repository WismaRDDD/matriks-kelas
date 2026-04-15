import knex from '@/lib/knex';
import { NextResponse } from 'next/server';

// GET: ambil semua dosen
export async function GET() {
  const data = await knex('dosen')
    .select('*')
    .orderBy('id', 'desc');

  return NextResponse.json(data);
}

// POST: tambah dosen manual
export async function POST(req) {
  const body = await req.json();

  await knex('dosen').insert({
    f_nidn: body.f_nidn,
    f_nip: body.f_nip,
    f_title_depan: body.f_title_depan,
    f_namapegawai: body.f_namapegawai,
    f_title_belakang: body.f_title_belakang,
    f_tempatlahir: body.f_tempatlahir,
    f_tanggallahir: body.f_tanggallahir,
    f_jeniskelamin: body.f_jeniskelamin,
    f_progdi_id: body.f_progdi_id,
  });

  return NextResponse.json({ success: true });
}

// PUT
export async function PUT(req, { params }) {
  const { id } = params;
  const body = await req.json();

  await knex('dosen').where({ id }).update(body);

  return NextResponse.json({ success: true });
}

// DELETE
export async function DELETE(req, { params }) {
  const { id } = params;

  await knex('dosen').where({ id }).del();

  return NextResponse.json({ success: true });
}
