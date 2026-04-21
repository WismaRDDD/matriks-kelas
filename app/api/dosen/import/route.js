import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import knex from '@/lib/knex';

// Convert Excel number → date
function excelDateToJSDate(serial) {
  if (!serial) return null;
  
  // If already a string date, return as is
  if (typeof serial === 'string') {
    return serial;
  }
  
  // Convert Excel serial to JS date
  if (typeof serial === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + serial * 86400000);
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }
  
  return null;
}

// Validate required fields
function validateRow(row, rowIndex) {
  const errors = [];
  
  if (!row.f_namapegawai || row.f_namapegawai.toString().trim() === '') {
    errors.push(`Row ${rowIndex}: Nama pegawai tidak boleh kosong`);
  }
  
  // Optional validations
  if (row.f_jeniskelamin && !['L', 'P', 'Laki-laki', 'Perempuan', 'Male', 'Female'].includes(row.f_jeniskelamin.toString().toUpperCase())) {
    errors.push(`Row ${rowIndex}: Jenis kelamin harus 'L' atau 'P' (atau Laki-laki/Perempuan)`);
  }
  
  return errors;
}

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json(
        { error: 'File tidak ditemukan' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const workbook = XLSX.read(buffer, {
      cellDates: false,
      raw: true,
    });
    
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    
    if (!sheet) {
      return NextResponse.json(
        { error: 'Sheet tidak ditemukan di file Excel' },
        { status: 400 }
      );
    }
    
    const rows = XLSX.utils.sheet_to_json(sheet, {
      raw: true,
    });

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: 'File Excel kosong atau format tidak benar' },
        { status: 400 }
      );
    }

    let success = 0;
    let failed = 0;
    let duplicated = 0;
    const errors = [];

    await knex.transaction(async (trx) => {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowIndex = i + 2; // Excel row (header di row 1, data mulai row 2)

        try {
          // Validate row
          const validationErrors = validateRow(row, rowIndex);
          if (validationErrors.length > 0) {
            errors.push(...validationErrors);
            failed++;
            continue;
          }

          const nidn = row.f_nidn ? row.f_nidn.toString().trim() : null;

          // Check if NIDN already exists
          if (nidn) {
            const existingDosen = await trx('dosen')
              .where({ f_nidn: nidn })
              .first();

            if (existingDosen) {
              errors.push(`Row ${rowIndex}: NIDN ${nidn} sudah ada (duplikat)`);
              duplicated++;
              continue;
            }
          }

          const data = {
            f_nidn: nidn,
            f_nip: row.f_nip ? row.f_nip.toString().trim() : null,
            f_title_depan: row.f_title_depan ? row.f_title_depan.toString().trim() : null,
            f_namapegawai: row.f_namapegawai.toString().trim(),
            f_title_belakang: row.f_title_belakang ? row.f_title_belakang.toString().trim() : null,
            f_tempatlahir: row.f_tempatlahir ? row.f_tempatlahir.toString().trim() : null,
            f_tanggallahir: excelDateToJSDate(row.f_tanggallahir),
            f_jeniskelamin: row.f_jeniskelamin ? row.f_jeniskelamin.toString().trim() : null,
            f_progdi_id: row.f_progdi_id ? row.f_progdi_id.toString().trim() : null,
            prefer_lantai: row.prefer_lantai ? row.prefer_lantai.toString().trim() : null,
            prefer_hari: row.prefer_hari ? row.prefer_hari.toString().trim() : null,
            avoid_hari: row.avoid_hari ? row.avoid_hari.toString().trim() : null,
            prefer_jam_mulai: row.prefer_jam_mulai ? row.prefer_jam_mulai.toString().trim() : null,
            prefer_jam_selesai: row.prefer_jam_selesai ? row.prefer_jam_selesai.toString().trim() : null,
          };

          await trx('dosen').insert(data);
          success++;
        } catch (err) {
          console.error(`Row ${rowIndex} error:`, err.message);
          errors.push(`Row ${rowIndex}: ${err.message}`);
          failed++;
        }
      }
    });

    return NextResponse.json({
      success: true,
      summary: {
        total: rows.length,
        success,
        failed,
        duplicated,
      },
      errors: errors.length > 0 ? errors : undefined,
      message: `Import selesai: ${success} berhasil, ${failed} gagal, ${duplicated} duplikat`,
    });
  } catch (error) {
    console.error('❌ Import dosen error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

