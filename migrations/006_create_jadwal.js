// 006_create_jadwal.js
export async function up(knex) {
  // Cek apakah tabel sudah ada, jika ada drop dulu
  if (await knex.schema.hasTable('jadwal')) {
    await knex.schema.dropTable('jadwal');
  }

  await knex.schema.createTable('jadwal', (table) => {
    table.increments('id').primary();

    // Foreign key ke tabel kelas
    table.integer('kelas_id')
      .unsigned()
      .references('id')
      .inTable('kelas')
      .onDelete('CASCADE')
      .comment('Referensi ke tabel kelas');

    // Foreign key ke tabel ruangan
    table.integer('ruangan_id')
      .unsigned()
      .references('id')
      .inTable('ruangan')
      .onDelete('RESTRICT')
      .comment('Referensi ke tabel ruangan');

    // Foreign key ke tabel dosen
    table.integer('dosen_id')
      .unsigned()
      .references('id')
      .inTable('dosen')
      .onDelete('RESTRICT')
      .nullable()
      .comment('Referensi ke tabel dosen');

    // Foreign key ke tabel kurikulum
    table.integer('kurikulum_id')
      .unsigned()
      .references('id')
      .inTable('kurikulum')
      .onDelete('RESTRICT')
      .nullable()
      .comment('Referensi ke tabel kurikulum');

    // Informasi jadwal
    table.string('hari').notNullable().comment('Hari: Senin, Selasa, dll');
    table.time('jam_mulai').notNullable();
    table.time('jam_selesai').notNullable();

    // Denormalisasi data dari tabel terkait (untuk keperluan display/report)
    table.string('display_name').nullable().comment('Format: Nama MK (Semester+Kelas+Kode-Dosen)');
    table.integer('sks').nullable().comment('Jumlah SKS (dari f_sks_kurikulum)');
    table.string('nama_mk').nullable().comment('Nama mata kuliah (dari tabel kurikulum)');
    table.string('kode_mk').nullable().comment('Kode mata kuliah (dari tabel kurikulum)');
    table.string('nama_dosen').nullable().comment('Nama dosen (dari tabel dosen)');
    table.string('nama_ruangan').nullable().comment('Nama ruangan (dari tabel ruangan)');
    table.integer('semester').nullable().comment('Semester mata kuliah');
    table.integer('lantai').nullable().comment('Lantai ruangan (dari tabel ruangan)');

    table.timestamps(true, true);

    // Index untuk performance query
    table.index(['hari', 'ruangan_id']);
    table.index('kelas_id');
    table.index('dosen_id');
    table.index('kurikulum_id');
    table.index('jam_mulai');
    table.index('jam_selesai');
    table.index('ruangan_id');
  });
}

export async function down(knex) {
  await knex.schema.dropTable('jadwal');
}