export default ({ env }) => {
  const client = env('DATABASE_CLIENT', env('DATABASE_URL') ? 'postgres' : 'sqlite');

  if (client === 'postgres') {
    return {
      connection: {
        client: 'postgres',
        connection: {
          connectionString: env('DATABASE_URL'),
          ssl: env.bool('DATABASE_SSL', false)
            ? { rejectUnauthorized: false }
            : false,
        },
        pool: {
          min: env.int('DATABASE_POOL_MIN', 0),
          max: env.int('DATABASE_POOL_MAX', 10),
        },
      },
    };
  }

  // Default to SQLite for local development to avoid ECONNREFUSED when no DB is running
  return {
    connection: {
      client: 'sqlite',
      connection: {
        filename: env('DATABASE_FILENAME', '.tmp/data.db'),
      },
      useNullAsDefault: true,
    },
  };
};
