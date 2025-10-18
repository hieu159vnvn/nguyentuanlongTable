export default ({ strapi }: { strapi: any }) => ({
  async calculate(ctx) {
    const {
      type, // 'short' | 'package'
      hours = 0,
      packageId,
      shortTermHours, // when type = 'short'
      accessories = [], // [{ accessoryId, quantity }]
      discount = 0
    } = ctx.request.body || {};

    let rentalCost = 0;
    let bonusHours = 0;
    let packageInfo = null;

    if (type === 'short') {
      // Load short-term pricing tiers
      const tiers = await strapi.entityService.findMany('api::pricing-short-term.pricing-short-term', {
        sort: { minHours: 'asc' },
        fields: ['minHours', 'maxHours', 'pricePerHour']
      });
      const applicable = tiers.find(t =>
        shortTermHours >= t.minHours && (t.maxHours == null || shortTermHours <= t.maxHours)
      );
      if (!applicable) {
        ctx.throw(400, 'No applicable short-term rate');
      }
      rentalCost = Math.round(shortTermHours * applicable.pricePerHour);
    } else if (type === 'package') {
      if (!packageId) ctx.throw(400, 'packageId is required');
      packageInfo = await strapi.entityService.findOne('api::pricing-long-term-package.pricing-long-term-package', packageId, {
        fields: ['totalHours', 'price', 'bonusHours', 'name']
      });
      if (!packageInfo) ctx.throw(404, 'Package not found');
      rentalCost = packageInfo.price;
      bonusHours = packageInfo.bonusHours || 0;
    } else {
      ctx.throw(400, 'Invalid type');
    }

    // Accessories
    let accessoriesTotal: number = 0;
    if (Array.isArray(accessories) && accessories.length) {
      const ids = accessories.map((a) => a.accessoryId).filter(Boolean);
      const items = await strapi.entityService.findMany('api::accessory.accessory', {
        filters: { id: { $in: ids } },
        fields: ['id', 'price']
      });
      const idToPrice = new Map(items.map((i: any) => [i.id, i.price]));
      for (const a of accessories) {
        const unit = idToPrice.get(a.accessoryId) || 0;
        const qty = Number(a.quantity || 1);
        accessoriesTotal += Number(unit) * qty;
      }
    }

    const subtotal = rentalCost + accessoriesTotal;
    const discountValue = Math.max(0, Math.min(discount, subtotal));
    const total = subtotal - discountValue;

    ctx.body = {
      type,
      rentalCost,
      bonusHours,
      accessoriesTotal,
      subtotal,
      discount: discountValue,
      total,
      package: packageInfo
    };
  },

  async calculateRental(ctx) {
    const {
      customerId,
      rentalId,
      accessories = []
    } = ctx.request.body || {};

    if (!customerId || !rentalId) {
      ctx.throw(400, 'customerId and rentalId are required');
    }

    // Get customer info
    const customer = await strapi.entityService.findOne('api::customer.customer', customerId, {
      fields: ['id', 'name', 'remainingHours']
    });
    if (!customer) {
      ctx.throw(404, 'Customer not found');
    }

    // Get rental info
    const rental = await strapi.entityService.findOne('api::rental.rental', rentalId, {
      fields: ['id', 'startAt', 'type'],
      populate: {
        rentalAccessories: {
          fields: ['quantity', 'unitPrice', 'totalPrice'],
          populate: {
            accessory: {
              fields: ['name']
            }
          }
        }
      }
    });
    if (!rental) {
      ctx.throw(404, 'Rental not found');
    }

    // Calculate actual rental hours
    const startTime = new Date(rental.startAt);
    const now = new Date();
    const elapsedMs = now.getTime() - startTime.getTime();
    const actualHours = Math.ceil(elapsedMs / (1000 * 60 * 60)); // Round up to hours

    let rentalCost = 0;
    let usedPackageHours = 0;
    let paidHours = 0;
    let hourlyRate = 0;

    if (actualHours <= customer.remainingHours) {
      // Use package hours completely
      usedPackageHours = actualHours;
      paidHours = 0;
    } else {
      // Use remaining package hours + pay for excess
      usedPackageHours = customer.remainingHours;
      paidHours = actualHours - customer.remainingHours;
      
      // Calculate hourly rate based on paid hours
      if (paidHours >= 1 && paidHours <= 2) {
        hourlyRate = 50000;
      } else if (paidHours >= 3 && paidHours <= 9) {
        hourlyRate = 45000;
      } else if (paidHours > 9) {
        hourlyRate = 45000;
      }
      
      rentalCost = paidHours * hourlyRate;
    }

    // Calculate accessories total
    let accessoriesTotal = 0;
    const accessoriesList = [];
    
    if (rental.rentalAccessories && rental.rentalAccessories.length > 0) {
      for (const ra of rental.rentalAccessories) {
        const total = ra.totalPrice || (ra.unitPrice * ra.quantity);
        accessoriesTotal += total;
        accessoriesList.push({
          name: ra.accessory?.name || 'N/A',
          quantity: ra.quantity,
          unitPrice: ra.unitPrice,
          total: total
        });
      }
    }

    const subtotal = rentalCost + accessoriesTotal;

    ctx.body = {
      hours: actualHours,
      remainingHours: customer.remainingHours,
      usedPackageHours,
      paidHours,
      hourlyRate,
      rentalCost,
      accessoriesTotal,
      subtotal,
      accessories: accessoriesList,
      customer: {
        id: customer.id,
        name: customer.name,
        remainingHours: customer.remainingHours
      }
    };
  }
});


