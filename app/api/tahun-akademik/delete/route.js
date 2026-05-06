import knex from '@/lib/knex';
import { NextResponse } from 'next/server';

// POST: delete tahun akademik (bulk delete)
export async function POST(req) {
  try {
    const body = await req.json();

    if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json(
        { error: 'IDs diperlukan' },
        { status: 400 }
      );
    }

    await knex('tahun_akademik').whereIn('id', body.ids).del();

    return NextResponse.json({
      success: true,
      message: 'Tahun akademik berhasil dihapus'
    });
  } catch (err) {
    console.error('❌ DELETE tahun_akademik error:', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

// DELETE: delete single tahun akademik
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

    const result = await knex('tahun_akademik').where({ id }).del();

    if (result === 0) {
      return NextResponse.json(
        { error: 'Tahun akademik tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Tahun akademik berhasil dihapus'
    });
  } catch (err) {
    console.error('❌ DELETE tahun_akademik error:', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
