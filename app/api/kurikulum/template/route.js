import { writeFile } from 'fs/promises';
import { join } from 'path';
import * as XLSX from 'xlsx';

export async function GET(req) {
  try {
    // Template data dengan struktur yang sesuai dengan database
    const templateData = [
      {
        'Kode MK': 'MK001',
        'Nama MK': 'Contoh Mata Kuliah',
        'SKS': 3,
        'Semester': 1,
        'Nama Kelompok': 'Kelompok A',
        'Singkatan': 'KMK',
        'Status Aktif': 'Aktif',
      },
      {
        'Kode MK': 'MK002',
        'Nama MK': 'Mata Kuliah Lainnya',
        'SKS': 4,
        'Semester': 2,
        'Nama Kelompok': 'Kelompok B',
        'Singkatan': 'KML',
        'Status Aktif': 'Aktif',
      },
    ];

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 12 }, // Kode MK
      { wch: 30 }, // Nama MK
      { wch: 8 },  // SKS
      { wch: 10 }, // Semester
      { wch: 18 }, // Nama Kelompok
      { wch: 12 }, // Singkatan
      { wch: 15 }, // Status Aktif
    ];

    // Add formatting to header
    const headerRange = 'A1:G1';
    worksheet['!freeze'] = { xSplit: 0, ySplit: 1 };

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');

    // Generate buffer
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    // Return response with proper headers
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="template_kurikulum.xlsx"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Template generation error:', error);
    return Response.json(
      { error: 'Gagal membuat template' },
      { status: 500 }
    );
  }
}
