import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::pricing-long-term-package.pricing-long-term-package', {
  config: {
    find: { auth: false },
    findOne: { auth: false }
  }
});


