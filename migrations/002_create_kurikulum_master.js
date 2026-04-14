export async function up(knex) {
  await knex.schema.createTable('kurikulum_master', (table) => {
    table.increments('id').primary();
    table.string('nama_kurikulum', 50);
    table.integer('tahun_ajaran');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex) {
  await knex.schema.dropTable('kurikulum_master');
}