export async function up(knex) {
  await knex.schema.createTable('kurikulum_master', (table) => {
    table.increments('id').primary();
    table.string('kode_kurikulum', 20).notNullable().unique();
    table.string('nama_kurikulum', 50);
    table.integer('tahun_kurikulum');
    table.string('nama_panjang_kurikulum', 100);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex) {
  await knex.schema.dropTable('kurikulum_master');
}