import knex from '@/lib/knex';
import { NextResponse } from 'next/server';

<<<<<<< HEAD
export async function GET() {
  const data = await knex('ruangan').select('*');
  return NextResponse.json(data);
}

export async function POST(req) {
  const body = await req.json();
  await knex('ruangan').insert(body);
=======
// GET: ambil semua ruangan
export async function GET() {
  const data = await knex('ruangan')
    .select('*')
    .orderBy('id', 'desc');

  return NextResponse.json(data);
}

// POST: tambah ruangan manual
export async function POST(req) {
  const body = await req.json();

  await knex('ruangan').insert({
    f_ruang_id: body.f_ruang_id,
    f_koderuang: body.f_koderuang,
    f_namaruang: body.f_namaruang,
    f_kapasitas_kuliah: body.f_kapasitas_kuliah,
    f_alamatruang: body.f_alamatruang,
  });

  return NextResponse.json({ success: true });
}


// PUT
export async function PUT(req, { params }) {
  const { id } = params;
  const body = await req.json();

  await knex('ruangan').where({ id }).update(body);

  return NextResponse.json({ success: true });
}

// DELETE
export async function DELETE(req, { params }) {
  const { id } = params;

  await knex('ruangan').where({ id }).del();

>>>>>>> recovery
  return NextResponse.json({ success: true });
}