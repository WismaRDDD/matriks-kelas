import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import knex from '@/lib/knex';

// Helper function to safely parse integers
const safeParseInt = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = parseInt(value);
  return isNaN(parsed) ? null : parsed;
};

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    const buffer = Buffer.from(await file.arrayBuffer());

    const workbook = XLSX.read(buffer, {
      cellDates: false,
      raw: true,
    });    
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, {
      raw: true,
    });

    let success = 0;
    let failed = 0;
    let duplicate = 0;
    const errors = [];

    for (const row of rows) {
      try {
        const data = {
          f_ruang_id: safeParseInt(row.f_ruang_id),
          f_koderuang: row.f_koderuang || null,
          f_namaruang: row.f_namaruang || null,
          f_kapasitas_kuliah: safeParseInt(row.f_kapasitas_kuliah),
          lantai: safeParseInt(row.lantai),
          f_alamatruang: row.f_alamatruang || null,
        };

        // Validate required fields
        if (!data.f_namaruang) {
          failed++;
          errors.push(`Nama ruangan wajib diisi`);
          continue;
        }

        // Check for duplicates
        const existingRecord = await knex('ruangan')
          .where(function() {
            if (data.f_koderuang) {
              this.where('f_koderuang', data.f_koderuang);
            }
            if (data.f_namaruang) {
              this.orWhere('f_namaruang', data.f_namaruang);
            }
          })
          .first();

        if (existingRecord) {
          duplicate++;
          errors.push(`Duplikat: ${data.f_namaruang} (${data.f_koderuang})`);
          continue;
        }

        await knex('ruangan').insert(data);
        success++;
      } catch (err) {
        console.error('Row error:', err);
        failed++;
        errors.push(`${err.message}`);
      }
    }

    return NextResponse.json({ success, failed, duplicate, errors });

  } catch (error) {
    console.error('❌ Import ruangan error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}