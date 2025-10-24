export default {
  routes: [
    {
      method: 'POST',
      path: '/orders/short-rental',
      handler: 'orders.shortRental',
      config: { auth: false }
    },
    {
      method: 'POST',
      path: '/orders/purchase-package',
      handler: 'orders.purchasePackage',
      config: { auth: false }
    },
    {
      method: 'POST',
      path: '/orders/purchase-package-only',
      handler: 'orders.purchasePackageOnly',
      config: { auth: false }
    },
    {
      method: 'GET',
      path: '/tables/status',
      handler: 'orders.tableStatus',
      config: { auth: false }
    },
    {
      method: 'POST',
      path: '/tables/:tableId/start-short',
      handler: 'orders.startShortOnTable',
      config: { auth: false }
    },
    {
      method: 'POST',
      path: '/tables/:tableId/settle',
      handler: 'orders.settleTable',
      config: { auth: false }
    }
  ]
};


