import knex from '@/lib/knex';
import { NextResponse } from 'next/server';

// GET: ambil semua kurikulum
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const kurikulum_id = searchParams.get('kurikulum_id');

  if (!kurikulum_id) return NextResponse.json([]);

  const data = await knex('kurikulum')
    .where({ f_kurikulum: kurikulum_id }); 

  return NextResponse.json(data);
}

// POST: tambah kurikulum manual
export async function POST(req) {
  const body = await req.json();

  await knex('kurikulum').insert({
    f_kodemk: body.f_kodemk,
    f_namamk: body.f_namamk,
    f_sks_kurikulum: body.f_sks_kurikulum,
    f_semester: body.f_semester,
    f_namakelompok: body.f_namakelompok,
    f_singkatan: body.f_singkatan,
    f_statusaktifmk: body.f_statusaktifmk,
    f_kurikulum: body.f_kurikulum,  
  });

  return NextResponse.json({ success: true });
}

// PUT
export async function PUT(req, { params }) {
  const { id } = params;
  const body = await req.json();

  await knex('kurikulum').where({ id }).update(body);

  return NextResponse.json({ success: true });
}

// DELETE
export async function DELETE(req, { params }) {
  const { id } = params;

  await knex('kurikulum').where({ id }).del();

  return NextResponse.json({ success: true });
}