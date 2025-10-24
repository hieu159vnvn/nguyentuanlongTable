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
  },

  async update(ctx) {
    const { id } = ctx.params;
    const { data } = ctx.request.body;
    
    try {
      // First check if customer exists
      const customer = await strapi.entityService.findOne('api::customer.customer', id);
      if (!customer) {
        return ctx.notFound('Customer not found');
      }

      // Update the customer
      const result = await strapi.entityService.update('api::customer.customer', id, {
        data: data
      });
      
      return { data: result };
    } catch (error) {
      console.error('Error updating customer:', error);
      return ctx.internalServerError('Failed to update customer');
    }
  },

  async delete(ctx) {
    const { id } = ctx.params;
    
    try {
      // First check if customer exists
      const customer = await strapi.entityService.findOne('api::customer.customer', id);
      if (!customer) {
        return ctx.notFound('Customer not found');
      }

      // Check for related rentals
      const rentals = await strapi.entityService.findMany('api::rental.rental', {
        filters: { customer: id }
      });

      // Check for related invoices
      const invoices = await strapi.entityService.findMany('api::invoice.invoice', {
        filters: { customer: id }
      });

      if (rentals.length > 0 || invoices.length > 0) {
        return ctx.badRequest('Cannot delete customer with existing rentals or invoices');
      }

      // Delete the customer
      const result = await strapi.entityService.delete('api::customer.customer', id);
      
      // Return 204 No Content
      ctx.status = 204;
      return null;
    } catch (error) {
      console.error('Error deleting customer:', error);
      return ctx.internalServerError('Failed to delete customer');
    }
  }
}));



