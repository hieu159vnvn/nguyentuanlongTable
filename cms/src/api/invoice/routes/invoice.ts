import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::invoice.invoice', {
  config: {
    find: { auth: false },
    findOne: { auth: false }
  }
});




