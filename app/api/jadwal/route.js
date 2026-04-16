import knex from '@/lib/knex';
import { NextResponse } from 'next/server';

export async function GET() {
  const data = await knex('jadwal');
  return NextResponse.json(data);
}

export async function POST(req) {
  const body = await req.json();

  await knex('jadwal').insert(body);

  return NextResponse.json({ success: true });
}

export async function PUT(req) {
  try {
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json(
        { error: 'ID diperlukan' },
        { status: 400 }
      );
    }

    await knex('jadwal').where({ id: body.id }).update({
      hari: body.hari,
      ruangan_id: body.ruangan_id,
      jam_mulai: body.jam_mulai,
      jam_selesai: body.jam_selesai,
      isi: body.isi,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  const body = await req.json();

  await knex('jadwal')
    .where({ id: body.id })
    .del();

  return NextResponse.json({ success: true });
}