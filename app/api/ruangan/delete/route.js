import { NextResponse } from 'next/server';
import knex from '@/lib/knex';

export async function DELETE(req) {
  try {
    const body = await req.json();
    const { id, ids } = body;

    // Handle single delete
    if (id) {
      const ruanganExists = await knex('ruangan')
        .where({ id })
        .first();

      if (!ruanganExists) {
        return NextResponse.json(
          { error: 'Ruangan tidak ditemukan' },
          { status: 404 }
        );
      }

      // Cek apakah ruangan ada jadwal terkait
      const jadwalCount = await knex('jadwal')
        .where({ ruangan_id: id })
        .count('* as count')
        .first();

      if (jadwalCount.count > 0) {
        return NextResponse.json(
          { error: `Ruangan tidak dapat dihapus karena masih memiliki ${jadwalCount.count} jadwal terkait` },
          { status: 409 }
        );
      }

      const deleted = await knex('ruangan')
        .where({ id })
        .del();

      return NextResponse.json({
        success: true,
        deleted: deleted,
        message: `${deleted} ruangan berhasil dihapus`
      });
    }

    // Handle batch delete
    if (ids && Array.isArray(ids) && ids.length > 0) {
      const existingCount = await knex('ruangan')
        .whereIn('id', ids)
        .count('* as count')
        .first();

      if (existingCount.count === 0) {
        return NextResponse.json(
          { error: 'Tidak ada ruangan yang ditemukan' },
          { status: 404 }
        );
      }

      // Cek apakah ada ruangan yang punya jadwal
      const jadwalCount = await knex('jadwal')
        .whereIn('ruangan_id', ids)
        .count('* as count')
        .first();

      if (jadwalCount.count > 0) {
        return NextResponse.json(
          { error: `Beberapa ruangan masih memiliki jadwal terkait (${jadwalCount.count} jadwal). Hapus jadwal terlebih dahulu.` },
          { status: 409 }
        );
      }

      const deleted = await knex('ruangan')
        .whereIn('id', ids)
        .del();

      return NextResponse.json({
        success: true,
        deleted: deleted,
        message: `${deleted} ruangan berhasil dihapus`
      });
    }

    return NextResponse.json(
      { error: 'ID atau IDs diperlukan' },
      { status: 400 }
    );
  } catch (err) {
    console.error('❌ DELETE ruangan error:', err);
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
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Array ids diperlukan' },
        { status: 400 }
      );
    }

    const existingCount = await knex('ruangan')
      .whereIn('id', ids)
      .count('* as count')
      .first();

    if (existingCount.count === 0) {
      return NextResponse.json(
        { error: 'Tidak ada ruangan yang ditemukan' },
        { status: 404 }
      );
    }

    // Cek apakah ada ruangan yang punya jadwal
    const jadwalCount = await knex('jadwal')
      .whereIn('ruangan_id', ids)
      .count('* as count')
      .first();

    if (jadwalCount.count > 0) {
      return NextResponse.json(
        { error: `Beberapa ruangan masih memiliki jadwal terkait (${jadwalCount.count} jadwal). Hapus jadwal terlebih dahulu.` },
        { status: 409 }
      );
    }

    const deleted = await knex('ruangan')
      .whereIn('id', ids)
      .del();

    return NextResponse.json({
      success: true,
      deleted: deleted,
      message: `${deleted} ruangan berhasil dihapus`
    });
  } catch (err) {
    console.error('❌ POST ruangan/delete error:', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
