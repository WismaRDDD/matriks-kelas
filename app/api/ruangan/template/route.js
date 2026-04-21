import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET() {
  try {
    // Create sample data with headers
    const templateData = [
      {
        f_ruang_id: null,
        f_koderuang: 'R-101',
        f_namaruang: 'Ruang Kelas A',
        f_kapasitas_kuliah: 30,
        lantai: 1,
        f_alamatruang: 'Gedung A, Lantai 1',
      },
      {
        f_ruang_id: null,
        f_koderuang: 'R-102',
        f_namaruang: 'Ruang Kelas B',
        f_kapasitas_kuliah: 35,
        lantai: 1,
        f_alamatruang: 'Gedung A, Lantai 1',
      },
      {
        f_ruang_id: null,
        f_koderuang: 'R-201',
        f_namaruang: 'Ruang Kelas C',
        f_kapasitas_kuliah: 40,
        lantai: 2,
        f_alamatruang: 'Gedung A, Lantai 2',
      },
    ];

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 12 }, // f_ruang_id
      { wch: 12 }, // f_koderuang
      { wch: 20 }, // f_namaruang
      { wch: 15 }, // f_kapasitas_kuliah
      { wch: 10 }, // lantai
      { wch: 25 }, // f_alamatruang
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ruangan');

    // Write to buffer
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

    // Return as file download
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="template_ruangan.xlsx"',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
