export function up(knex) {
  return knex.schema.createTable('ruangan', table => {
    table.increments('id');
    table.string('f_ruang_id');
    table.string('f_koderuang');
    table.string('f_namaruang');
    table.integer('f_kapasitas_kuliah');
    table.text('f_alamatruang');
    table.timestamps(true, true);
  });
}

export function down(knex) {
  return knex.schema.dropTable('ruangan');
}