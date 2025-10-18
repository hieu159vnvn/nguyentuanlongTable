export default {
  routes: [
    {
      method: 'GET',
      path: '/bank-info',
      handler: 'bank-info.find',
      config: { auth: false }
    }
  ]
};




