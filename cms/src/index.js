export default {
    register() {},
  
    async bootstrap({ strapi }) {
      const adminExists = await strapi.db.query('admin::user').findOne({
        where: { email: process.env.ADMIN_EMAIL },
      });
  
      if (!adminExists) {
        await strapi.admin.createUser({
          email: process.env.ADMIN_EMAIL,
          firstname: process.env.ADMIN_FIRSTNAME || 'Admin',
          lastname: process.env.ADMIN_LASTNAME || 'User',
          password: process.env.ADMIN_PASSWORD,
          isActive: true,
        });
        strapi.log.info('✅ Admin user created successfully');
      } else {
        strapi.log.info('ℹ️ Admin user already exists');
      }
    },
  };
  