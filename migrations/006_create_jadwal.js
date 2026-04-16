export async function up(knex) {
  await knex.schema.createTable('jadwal', (table) => {
    table.increments('id').primary();

    table.string('hari'); // Senin
    table.integer('ruangan_id');

    table.time('jam_mulai');
    table.time('jam_selesai');

    // isi jadwal (1 cell)
    table.string('isi'); 
    // contoh: Pendidikan Agama (2A-SI-Bayu)

    table.timestamps(true, true);
  });
}

export async function down(knex) {
  await knex.schema.dropTable('jadwal');
}