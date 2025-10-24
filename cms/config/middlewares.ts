export default [
  'strapi::logger',
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: false,
    },
  },
  {
    name: 'strapi::cors',
    config: {
      enabled: true,
      headers: '*',
      origin: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://0.0.0.0:3000',
        'http://192.168.1.69:3000',
        'https://your-vercel-domain.vercel.app', // 👈 thêm domain FE thật nếu có
      ],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
      keepHeaderOnError: true,
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  {
    name: 'strapi::session',
    config: {
      secure: false, // 👈 dòng này rất quan trọng để tránh lỗi "Cannot send secure cookie..."
      sameSite: 'lax',
    },
  },
  'strapi::favicon',
  'strapi::public',
];
