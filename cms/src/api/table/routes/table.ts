import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::table.table', {
  config: {
    find: { auth: false },
    findOne: { auth: false }
  }
});




