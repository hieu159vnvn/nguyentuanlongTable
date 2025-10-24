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
      fields: ['id', 'name', 'remainingMinutes']
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

    // Calculate actual rental minutes
    const startTime = new Date(rental.startAt);
    const now = new Date();
    const elapsedMs = now.getTime() - startTime.getTime();
    const actualMinutes = Math.ceil(elapsedMs / (1000 * 60)); // Round up to minutes
    const actualHours = actualMinutes / 60; // Convert to hours for display

    let rentalCost = 0;
    let usedPackageMinutes = 0;
    let paidMinutes = 0;
    let minuteRate = 0;

    // Get customer remaining minutes directly
    const remainingMinutes = customer.remainingMinutes || 0;

    if (actualMinutes <= remainingMinutes) {
      // Use package minutes completely
      usedPackageMinutes = actualMinutes;
      paidMinutes = 0;
    } else {
      // Use remaining package minutes + pay for excess
      usedPackageMinutes = remainingMinutes;
      paidMinutes = actualMinutes - remainingMinutes;
      
      // Calculate minute rate based on paid minutes
      // 50k/hour = 833.33/minute, 45k/hour = 750/minute
      const paidHours = paidMinutes / 60;
      if (paidHours <= 2) {
        minuteRate = 50000 / 60; // 833.33/minute
      } else {
        minuteRate = 45000 / 60; // 750/minute
      }
      
      rentalCost = paidMinutes * minuteRate;
    }

    console.log('Pricing calculation:', {
      customerId,
      actualMinutes,
      remainingMinutes,
      usedPackageMinutes,
      paidMinutes,
      rentalCost
    });

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

    // Find package purchased by customer after rental started
    let packageInfo = null;
    let packageTotal = 0;
    
    try {
      const packageRentals = await strapi.entityService.findMany('api::rental.rental', {
        filters: {
          customer: customerId,
          type: 'package',
          startAt: { $gte: rental.startAt } // Package purchased after rental started
        },
        fields: ['id', 'startAt', 'minutes', 'totalAmount'],
        populate: {
          package: {
            fields: ['name', 'totalHours', 'bonusHours', 'price']
          }
        },
        sort: { startAt: 'desc' },
        limit: 1
      });

      if (packageRentals && packageRentals.length > 0) {
        const packageRental = packageRentals[0];
        packageInfo = {
          name: packageRental.package?.name || 'N/A',
          totalHours: packageRental.package?.totalHours || 0,
          bonusHours: packageRental.package?.bonusHours || 0,
          price: packageRental.package?.price || 0
        };
        packageTotal = packageRental.package?.price || 0;
        
        console.log('Package found:', {
          packageName: packageInfo.name,
          packagePrice: packageTotal,
          packageRentalId: packageRental.id
        });
      }
    } catch (error) {
      console.log('Error finding package:', error);
    }

    const subtotal = rentalCost + accessoriesTotal + packageTotal;

    ctx.body = {
      minutes: actualMinutes,
      hours: actualHours,
      remainingMinutes: remainingMinutes,
      remainingHours: Math.floor(remainingMinutes / 60) + (remainingMinutes % 60) / 60,
      usedPackageMinutes,
      usedPackageHours: usedPackageMinutes / 60,
      paidMinutes,
      paidHours: paidMinutes / 60,
      minuteRate,
      hourlyRate: minuteRate * 60,
      rentalCost,
      accessoriesTotal,
      packageTotal,
      subtotal,
      accessories: accessoriesList,
      package: packageInfo,
      customer: {
        id: customer.id,
        name: customer.name,
        remainingMinutes: customer.remainingMinutes,
        remainingHours: Math.floor(customer.remainingMinutes / 60) + (customer.remainingMinutes % 60) / 60
      }
    };
  }
});


