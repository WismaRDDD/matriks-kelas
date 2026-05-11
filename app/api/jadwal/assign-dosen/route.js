import knex from '@/lib/knex';
import { NextResponse } from 'next/server';

// POST: Bulk assign dosen_id to jadwal records based on kelas.dosen field
export async function POST(req) {
  try {
    const body = await req.json();
    const { nidn } = body;

    if (!nidn) {
      return NextResponse.json(
        { error: 'NIDN diperlukan' },
        { status: 400 }
      );
    }

    // Find dosen by NIDN
    const dosen = await knex('dosen')
      .where('f_nidn', nidn.toString().trim())
      .first();

    if (!dosen) {
      return NextResponse.json(
        { error: `Dosen dengan NIDN ${nidn} tidak ditemukan` },
        { status: 404 }
      );
    }

    // Find all kelas where dosen field matches the NIDN
    const kelasList = await knex('kelas')
      .where('dosen', nidn.toString().trim());

    if (kelasList.length === 0) {
      return NextResponse.json(
        { 
          success: true, 
          message: `Tidak ada kelas dengan dosen NIDN ${nidn}`,
          updatedCount: 0
        }
      );
    }

    const kelasIds = kelasList.map(k => k.id);

    // Update all jadwal records for these kelas to set dosen_id
    const updatedCount = await knex('jadwal')
      .whereIn('kelas_id', kelasIds)
      .where('dosen_id', null)
      .update({ dosen_id: dosen.id });

    return NextResponse.json({
      success: true,
      message: `Berhasil update ${updatedCount} jadwal dengan dosen_id untuk NIDN ${nidn}`,
      dosenId: dosen.id,
      dosenName: dosen.f_namapegawai,
      kelasCount: kelasList.length,
      updatedCount: updatedCount,
    });
  } catch (err) {
    console.error('❌ Assign dosen error:', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
