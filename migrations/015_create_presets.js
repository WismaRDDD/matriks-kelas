export async function up(knex) {
  return knex.schema.createTable('presets', (table) => {
    table.increments('id').primary();
    table.string('nama_preset').unique().notNullable();
    table.time('jam_mulai').notNullable().defaultTo('07:10');
    table.integer('durasi_slot').notNullable().defaultTo(50);
    table.time('jam_istirahat_mulai_senin_kamis').notNullable().defaultTo('12:10');
    table.time('jam_istirahat_selesai_senin_kamis').notNullable().defaultTo('13:00');
    table.time('jam_istirahat_mulai_jumat').notNullable().defaultTo('11:20');
    table.time('jam_istirahat_selesai_jumat').notNullable().defaultTo('13:30');
    table.time('jam_selesai').notNullable().defaultTo('18:00');
    table.boolean('is_default').defaultTo(false);
    table.timestamps(true, true);
  });
}

export async function down(knex) {
  return knex.schema.dropTable('presets');
}
