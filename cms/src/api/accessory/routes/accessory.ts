import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::accessory.accessory', {
  config: {
    find: { auth: false },
    findOne: { auth: false }
  }
});


