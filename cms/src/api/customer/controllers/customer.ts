import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::customer.customer', ({ strapi }) => ({
  async create(ctx) {
    const { data } = ctx.request.body;
    
    // Auto-generate customerCode if not provided
    if (!data.customerCode) {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      data.customerCode = `KH${timestamp}${random}`;
    }
    
    // Update the request body with the generated customerCode
    ctx.request.body.data = data;
    
    // Call the default create method using the service
    return await strapi.entityService.create('api::customer.customer', {
      data: data
    });
  }
}));



