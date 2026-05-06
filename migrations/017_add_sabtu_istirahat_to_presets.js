export async function up(knex) {
  return knex.schema.alterTable('presets', (table) => {
    table.time('jam_istirahat_mulai_sabtu').notNullable().defaultTo('12:10');
    table.time('jam_istirahat_selesai_sabtu').notNullable().defaultTo('13:00');
  });
}

export async function down(knex) {
  return knex.schema.alterTable('presets', (table) => {
    table.dropColumn('jam_istirahat_mulai_sabtu');
    table.dropColumn('jam_istirahat_selesai_sabtu');
  });
}
