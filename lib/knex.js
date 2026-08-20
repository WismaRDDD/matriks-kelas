import knex from 'knex';
import config from '../knexfile.js';

const globalForDb = globalThis;

const db = globalForDb.__matriksKelasDb || knex({
	...config.development,
	pool: {
		min: 0,
		max: 5,
		idleTimeoutMillis: 10000,
		acquireTimeoutMillis: 10000,
	},
});

if (process.env.NODE_ENV !== 'production') {
	globalForDb.__matriksKelasDb = db;
}

export default db;