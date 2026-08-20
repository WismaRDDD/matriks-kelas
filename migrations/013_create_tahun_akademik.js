export function up(knex) {
  return knex.schema.createTable('tahun_ajaran', table => {
    table.increments('id');
    table.integer('tahun_awal').notNullable();
    table.integer('tahun_akhir').notNullable();
    table.string('tahun_ajaran').notNullable().unique();
    table.timestamps(true, true);
  });
}

export function down(knex) {
  return knex.schema.dropTable('tahun_ajaran');
}
