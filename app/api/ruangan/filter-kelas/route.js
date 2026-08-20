import { NextResponse } from 'next/server';
import knex from '@/lib/knex';

export async function GET(req) {
  try {
    const roomId = new URL(req.url).searchParams.get('ruangan_id');
    let query = knex('ruangan_kelas_filter').select('*');
    if (roomId) query = query.where({ ruangan_id: roomId });
    return NextResponse.json(await query.orderBy(['ruangan_id', 'jenis_kelas', 'kelas_id']));
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { ruangan_id: roomId, filters } = await req.json();
    if (!roomId || !Array.isArray(filters)) {
      return NextResponse.json({ error: 'Ruangan dan filter kelas wajib diisi' }, { status: 400 });
    }

    const validTypes = new Set(['biasa', 'praktikum', 'tidak_ada']);
    const rows = filters
      .filter((item) => validTypes.has(item.jenis_kelas) && (item.kelas_id || item.jenis_kelas === 'tidak_ada'))
      .map((item) => ({ ruangan_id: roomId, kelas_id: item.kelas_id, jenis_kelas: item.jenis_kelas }));

    await knex.transaction(async (trx) => {
      await trx('ruangan_kelas_filter').where({ ruangan_id: roomId }).del();
      if (rows.length > 0) await trx('ruangan_kelas_filter').insert(rows);
    });

    return NextResponse.json({ success: true, count: rows.length });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
