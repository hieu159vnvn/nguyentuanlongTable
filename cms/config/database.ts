export default ({ env }) => ({
  connection: {
    client: 'postgres',
    connection: {
      connectionString: env('DATABASE_URL'),
      ssl: {
        rejectUnauthorized: false, // ✅ Bỏ qua xác minh chứng chỉ SSL
      },
    },
    pool: {
      min: 0,
      max: 10,
    },
  },
});
