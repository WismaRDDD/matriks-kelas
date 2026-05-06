export function up(knex) {
  return knex.schema.createTable('tahun_akademik', table => {
    table.increments('id');
    table.integer('tahun_awal').notNullable();
    table.integer('tahun_akhir').notNullable();
    table.string('tahun_akademik').notNullable().unique();
    table.timestamps(true, true);
  });
}

export function down(knex) {
  return knex.schema.dropTable('tahun_akademik');
}
