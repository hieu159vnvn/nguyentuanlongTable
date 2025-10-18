export default {
  routes: [
    {
      method: 'POST',
      path: '/pricing/calculate',
      handler: 'pricing.calculate',
      config: {
        auth: false
      }
    },
    {
      method: 'POST',
      path: '/pricing/calculate-rental',
      handler: 'pricing.calculateRental',
      config: {
        auth: false
      }
    }
  ]
};



