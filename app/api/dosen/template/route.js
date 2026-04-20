import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

// GET: template file Excel
export async function GET() {
  try {
    // Create template workbook
    const templateData = [
      {
        f_nidn: '0123456789',
        f_nip: '9876543210',
        f_title_depan: 'Dr.',
        f_namapegawai: 'Contoh Nama Dosen',
        f_title_belakang: 'M.Sc.',
        f_tempatlahir: 'Jakarta',
        f_tanggallahir: '1990-01-15',
        f_jeniskelamin: 'L',
        f_progdi_id: 'S1-IF',
        prefer_lantai: '2',
        prefer_hari: 'Senin,Selasa,Rabu',
        avoid_hari: 'Jumat',
        prefer_jam_mulai: '08:00',
        prefer_jam_selesai: '12:00',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dosen');

    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, // f_nidn
      { wch: 15 }, // f_nip
      { wch: 12 }, // f_title_depan
      { wch: 20 }, // f_namapegawai
      { wch: 12 }, // f_title_belakang
      { wch: 15 }, // f_tempatlahir
      { wch: 15 }, // f_tanggallahir
      { wch: 12 }, // f_jeniskelamin
      { wch: 12 }, // f_progdi_id
      { wch: 15 }, // prefer_lantai
      { wch: 25 }, // prefer_hari
      { wch: 15 }, // avoid_hari
      { wch: 15 }, // prefer_jam_mulai
      { wch: 15 }, // prefer_jam_selesai
    ];

    // Generate buffer
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

    return new NextResponse(buffer, {
      headers: {
        'Content-Disposition': 'attachment; filename="template-dosen.xlsx"',
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });
  } catch (error) {
    console.error('❌ Template download error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}