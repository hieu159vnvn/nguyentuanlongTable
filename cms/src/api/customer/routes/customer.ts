import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::customer.customer', {
  config: {
    find: { auth: false },
    findOne: { auth: false },
    create: { auth: false }
  }
});



