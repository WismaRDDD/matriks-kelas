import { NextResponse } from 'next/server';
import knex from '@/lib/knex';

export async function DELETE(req) {
  try {
    const body = await req.json();
    const { id, ids } = body;

    // Handle single delete
    if (id) {
      const dosenExists = await knex('dosen')
        .where({ id })
        .first();

      if (!dosenExists) {
        return NextResponse.json(
          { error: 'Dosen tidak ditemukan' },
          { status: 404 }
        );
      }

      const deleted = await knex('dosen')
        .where({ id })
        .del();

      return NextResponse.json({
        success: true,
        deleted: deleted,
        message: `${deleted} dosen berhasil dihapus`
      });
    }

    // Handle batch delete
    if (ids && Array.isArray(ids) && ids.length > 0) {
      const existingCount = await knex('dosen')
        .whereIn('id', ids)
        .count('* as count')
        .first();

      if (existingCount.count === 0) {
        return NextResponse.json(
          { error: 'Tidak ada dosen yang ditemukan' },
          { status: 404 }
        );
      }

      const deleted = await knex('dosen')
        .whereIn('id', ids)
        .del();

      return NextResponse.json({
        success: true,
        deleted: deleted,
        message: `${deleted} dosen berhasil dihapus`
      });
    }

    return NextResponse.json(
      { error: 'ID atau IDs diperlukan' },
      { status: 400 }
    );
  } catch (err) {
    console.error('❌ DELETE dosen error:', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

// Support POST untuk backward compatibility
export async function POST(req) {
  try {
    const body = await req.json();
    const { id, ids } = body;

    // Handle single delete
    if (id) {
      const dosenExists = await knex('dosen')
        .where({ id })
        .first();

      if (!dosenExists) {
        return NextResponse.json(
          { error: 'Dosen tidak ditemukan' },
          { status: 404 }
        );
      }

      const deleted = await knex('dosen')
        .where({ id })
        .del();

      return NextResponse.json({
        success: true,
        deleted: deleted,
        message: `${deleted} dosen berhasil dihapus`
      });
    }

    // Handle batch delete
    if (ids && Array.isArray(ids) && ids.length > 0) {
      const existingCount = await knex('dosen')
        .whereIn('id', ids)
        .count('* as count')
        .first();

      if (existingCount.count === 0) {
        return NextResponse.json(
          { error: 'Tidak ada dosen yang ditemukan' },
          { status: 404 }
        );
      }

      const deleted = await knex('dosen')
        .whereIn('id', ids)
        .del();

      return NextResponse.json({
        success: true,
        deleted: deleted,
        message: `${deleted} dosen berhasil dihapus`
      });
    }

    return NextResponse.json(
      { error: 'ID atau IDs diperlukan' },
      { status: 400 }
    );
  } catch (err) {
    console.error('❌ POST dosen/delete error:', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}