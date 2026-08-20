import knex from '@/lib/knex';
import { NextResponse } from 'next/server';

// POST: delete tahun ajaran (bulk delete)
export async function POST(req) {
  try {
    const body = await req.json();

    if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json(
        { error: 'IDs diperlukan' },
        { status: 400 }
      );
    }

    await knex('tahun_ajaran').whereIn('id', body.ids).del();

    return NextResponse.json({
      success: true,
      message: 'Tahun ajaran berhasil dihapus'
    });
  } catch (err) {
    console.error('❌ DELETE tahun_ajaran error:', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

// DELETE: delete single tahun ajaran
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID diperlukan' },
        { status: 400 }
      );
    }

    const result = await knex('tahun_ajaran').where({ id }).del();

    if (result === 0) {
      return NextResponse.json(
        { error: 'Tahun ajaran tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Tahun ajaran berhasil dihapus'
    });
  } catch (err) {
    console.error('❌ DELETE tahun_ajaran error:', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
