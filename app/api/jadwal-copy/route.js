import knex from '@/lib/knex';
import { NextResponse } from 'next/server';

// GET - Fetch jadwal copy
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const dosenId = url.searchParams.get('dosen_id');
    const jadwalId = url.searchParams.get('jadwal_id');

    let query = knex('jadwal_copy');

    if (dosenId) {
      query = query.where('dosen_id', parseInt(dosenId));
    }

    if (jadwalId) {
      query = query.where('jadwal_id', parseInt(jadwalId));
    }

    const data = await query;
    return NextResponse.json(data || []);
  } catch (err) {
    console.error('GET jadwal_copy error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST - Create jadwal copy (from current jadwal)
export async function POST(req) {
  try {
    const body = await req.json();
    // Body dapat berupa array of jadwal_id atau simple copy operation
    
    if (Array.isArray(body)) {
      // Bulk copy dari array jadwal IDs
      const jadwalIds = body;
      
      // Delete existing copies untuk jadwal-jadwal ini
      await knex('jadwal_copy')
        .whereIn('jadwal_id', jadwalIds)
        .del();

      // Insert new copies
      const jadwalRecords = await knex('jadwal')
        .whereIn('id', jadwalIds)
        .select('*');

      const copies = jadwalRecords.map(j => ({
        jadwal_id: j.id,
        kelas_id: j.kelas_id,
        ruangan_id: j.ruangan_id,
        dosen_id: j.dosen_id,
        kurikulum_id: j.kurikulum_id,
        hari: j.hari,
        jam_mulai: j.jam_mulai,
        jam_selesai: j.jam_selesai,
        display_name: j.display_name,
        sks: j.sks,
        nama_mk: j.nama_mk,
        kode_mk: j.kode_mk,
        nama_dosen: j.nama_dosen,
        nama_ruangan: j.nama_ruangan,
        semester: j.semester,
        lantai: j.lantai,
        learning_type: null,
        learning_time: null,
      }));

      await knex('jadwal_copy').insert(copies);

      return NextResponse.json({
        success: true,
        message: `${copies.length} jadwal copy telah dibuat`,
        count: copies.length,
      });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (err) {
    console.error('POST jadwal_copy error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT - Update jadwal copy (sync from original jadwal)
export async function PUT(req) {
  try {
    const body = await req.json();
    const { jadwal_id, learning_type, learning_time } = body;

    if (!jadwal_id) {
      return NextResponse.json({ error: 'jadwal_id diperlukan' }, { status: 400 });
    }

    const updateData = {};

    // Jika ada perubahan jadwal, sync dari original
    const originalJadwal = await knex('jadwal')
      .where('id', jadwal_id)
      .first();

    if (originalJadwal) {
      updateData.kelas_id = originalJadwal.kelas_id;
      updateData.ruangan_id = originalJadwal.ruangan_id;
      updateData.dosen_id = originalJadwal.dosen_id;
      updateData.kurikulum_id = originalJadwal.kurikulum_id;
      updateData.hari = originalJadwal.hari;
      updateData.jam_mulai = originalJadwal.jam_mulai;
      updateData.jam_selesai = originalJadwal.jam_selesai;
      updateData.display_name = originalJadwal.display_name;
      updateData.sks = originalJadwal.sks;
      updateData.nama_mk = originalJadwal.nama_mk;
      updateData.kode_mk = originalJadwal.kode_mk;
      updateData.nama_dosen = originalJadwal.nama_dosen;
      updateData.nama_ruangan = originalJadwal.nama_ruangan;
      updateData.semester = originalJadwal.semester;
      updateData.lantai = originalJadwal.lantai;
    }

    // Update learning type if provided
    if (learning_type) {
      updateData.learning_type = learning_type;
      updateData.learning_time = learning_time || knex.fn.now();
    }

    updateData.updated_at = knex.fn.now();

    const result = await knex('jadwal_copy')
      .where('jadwal_id', jadwal_id)
      .update(updateData);

    if (result === 0) {
      return NextResponse.json({ error: 'jadwal_copy tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'jadwal_copy berhasil diupdate',
    });
  } catch (err) {
    console.error('PUT jadwal_copy error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE - Delete jadwal copy
export async function DELETE(req) {
  try {
    const body = await req.json();
    const { jadwal_id } = body;

    if (!jadwal_id) {
      return NextResponse.json({ error: 'jadwal_id diperlukan' }, { status: 400 });
    }

    const result = await knex('jadwal_copy')
      .where('jadwal_id', jadwal_id)
      .del();

    if (result === 0) {
      return NextResponse.json({ error: 'jadwal_copy tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'jadwal_copy berhasil dihapus',
    });
  } catch (err) {
    console.error('DELETE jadwal_copy error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
