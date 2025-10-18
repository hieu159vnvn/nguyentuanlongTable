export default ({ strapi }: { strapi: any }) => ({
  async find(ctx) {
    const data = await strapi.entityService.findMany('api::bank-info.bank-info', {
      populate: { qrImage: true }
    });
    // singleType returns array when using findMany via entityService; ensure single result
    const first = Array.isArray(data) ? data[0] : data;
    ctx.body = first || {};
  }
});




