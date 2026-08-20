export async function up(knex) {
  const exists = await knex.schema.hasTable('kurikulum_template');

  if (!exists) {
    await knex.schema.createTable('kurikulum_template', (table) => {
      table.increments('id').primary();
      table.string('kode_kurikulum', 20).notNullable().unique();
      table.string('nama_kurikulum', 50).notNullable();
      table.timestamps(true, true);
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('kurikulum_template');
}