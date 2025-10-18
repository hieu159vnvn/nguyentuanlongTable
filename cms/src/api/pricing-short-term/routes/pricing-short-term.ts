import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::pricing-short-term.pricing-short-term', {
  config: {
    find: { auth: false },
    findOne: { auth: false }
  }
});


