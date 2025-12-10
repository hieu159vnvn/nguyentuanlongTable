export default ({ strapi }: { strapi: any }) => ({
  async shortRental(ctx) {
    const { customerId, customerCode, shortTermHours, accessories = [], discount = 0, note } = ctx.request.body || {};
    if ((!customerId && !customerCode) || !shortTermHours) ctx.throw(400, 'customerId/customerCode and shortTermHours are required');

    // resolve customer by id or code (create if code provided and not exists)
    let resolvedCustomerId = customerId;
    if (resolvedCustomerId) {
      const check = await strapi.entityService.findOne('api::customer.customer', resolvedCustomerId, { fields: ['id'] }).catch(() => null);
      if (!check) {
        // Generate unique customerCode
        const timestamp = Date.now();
        const created = await strapi.entityService.create('api::customer.customer', { data: { customerCode: `KH${timestamp}`, name: `Khách ${timestamp}` } });
        resolvedCustomerId = created.id;
      }
    }
    if (!resolvedCustomerId && customerCode) {
      const existing = await strapi.entityService.findMany('api::customer.customer', { filters: { customerCode: customerCode }, fields: ['id'] });
      if (existing?.[0]?.id) {
        resolvedCustomerId = existing[0].id;
      } else {
        const created = await strapi.entityService.create('api::customer.customer', { data: { customerCode, name: customerCode } });
        resolvedCustomerId = created.id;
      }
    }

    // Calculate pricing using existing controller logic with a local ctx
    const ctxLocal: any = { request: { body: { type: 'short', shortTermHours, accessories, discount } }, body: undefined };
    await strapi.controller('api::pricing.pricing').calculate(ctxLocal);
    const breakdown = ctxLocal.body;

    // Create rental
    const rental = await strapi.entityService.create('api::rental.rental', {
      data: {
        type: 'short',
        customer: resolvedCustomerId,
        hours: shortTermHours,
        totalAmount: breakdown.total,
        note
      }
    });

    // Create invoice
    const invoice = await strapi.entityService.create('api::invoice.invoice', {
      data: {
        code: `INV-${Date.now()}`,
        customer: resolvedCustomerId,
        rental: rental.id,
        subtotal: breakdown.subtotal,
        discount: breakdown.discount,
        total: breakdown.total,
        status: 'unpaid'
      }
    });

    ctx.body = { rental, invoice, breakdown };
  },

  async purchasePackage(ctx) {
    const { customerId, customerCode, packageId, discount = 0, note } = ctx.request.body || {};
    if ((!customerId && !customerCode) || !packageId) ctx.throw(400, 'customerId/customerCode and packageId are required');

    let resolvedCustomerId = customerId;
    if (resolvedCustomerId) {
      const check = await strapi.entityService.findOne('api::customer.customer', resolvedCustomerId, { fields: ['id'] }).catch(() => null);
      if (!check) {
        // Generate unique customerCode
        const timestamp = Date.now();
        const created = await strapi.entityService.create('api::customer.customer', { data: { customerCode: `KH${timestamp}`, name: `Khách ${timestamp}` } });
        resolvedCustomerId = created.id;
      }
    }
    if (!resolvedCustomerId && customerCode) {
      const existing = await strapi.entityService.findMany('api::customer.customer', { filters: { customerCode: customerCode }, fields: ['id'] });
      if (existing?.[0]?.id) {
        resolvedCustomerId = existing[0].id;
      } else {
        const created = await strapi.entityService.create('api::customer.customer', { data: { customerCode, name: customerCode } });
        resolvedCustomerId = created.id;
      }
    }

    // Load package
    const pkg = await strapi.entityService.findOne('api::pricing-long-term-package.pricing-long-term-package', packageId, {
      fields: ['totalHours', 'price', 'bonusHours', 'name']
    });
    if (!pkg) ctx.throw(404, 'Package not found');

    const subtotal = pkg.price;
    const discountValue = Math.max(0, Math.min(discount, subtotal));
    const total = subtotal - discountValue;

    // Update customer remaining minutes
    const addMinutes = ((pkg.totalHours || 0) + (pkg.bonusHours || 0)) * 60;
    const customer = await strapi.entityService.findOne('api::customer.customer', resolvedCustomerId, { fields: ['remainingMinutes'] });
    const newRemaining = (customer?.remainingMinutes || 0) + addMinutes;
    await strapi.entityService.update('api::customer.customer', resolvedCustomerId, { data: { remainingMinutes: newRemaining } });

    // Create rental record representing package purchase (no timespan)
    const rental = await strapi.entityService.create('api::rental.rental', {
      data: {
        type: 'package',
        customer: resolvedCustomerId,
        package: packageId,
        hours: pkg.totalHours,
        minutes: addMinutes, // Add minutes field
        totalAmount: total,
        startAt: new Date().toISOString(),
        endAt: new Date().toISOString(), // Package purchase is immediate
        note
      }
    });

    // Get customer info for invoice
    const customerInfo = await strapi.entityService.findOne('api::customer.customer', resolvedCustomerId, {
      fields: ['name', 'phone', 'customerCode']
    });

    // Prepare service details for package purchase
    const serviceDetails = {
      package: {
        name: pkg.name,
        totalHours: pkg.totalHours,
        bonusHours: pkg.bonusHours,
        price: pkg.price
      },
      accessories: [],
      pricing: {
        rentalCost: 0,
        accessoriesTotal: 0,
        subtotal,
        discount: discountValue,
        total
      }
    };

    // Create invoice
    const invoice = await strapi.entityService.create('api::invoice.invoice', {
      data: {
        code: `INV-${Date.now()}`,
        customer: resolvedCustomerId,
        customerName: customerInfo?.name || 'Khách vãng lai',
        customerPhone: customerInfo?.phone || '',
        customerCode: customerInfo?.customerCode || '',
        rental: rental.id,
        subtotal,
        discount: discountValue,
        total,
        status: 'unpaid',
        serviceDetails,
        rentalStartAt: rental.startAt,
        rentalEndAt: rental.endAt,
        rentalMinutes: addMinutes,
        rentalType: 'package',
        tableName: 'Mua gói'
      }
    });

    ctx.body = { rental, invoice, remainingHours: newRemaining };
  },

  async purchasePackageOnly(ctx) {
    const { customerId, customerCode, packageId, note } = ctx.request.body || {};
    if ((!customerId && !customerCode) || !packageId) ctx.throw(400, 'customerId/customerCode and packageId are required');

    let resolvedCustomerId = customerId;
    if (resolvedCustomerId) {
      const check = await strapi.entityService.findOne('api::customer.customer', resolvedCustomerId, { fields: ['id'] }).catch(() => null);
      if (!check) {
        // Generate unique customerCode
        const timestamp = Date.now();
        const created = await strapi.entityService.create('api::customer.customer', { data: { customerCode: `KH${timestamp}`, name: `Khách ${timestamp}` } });
        resolvedCustomerId = created.id;
      }
    }
    if (!resolvedCustomerId && customerCode) {
      const existing = await strapi.entityService.findMany('api::customer.customer', { filters: { customerCode: customerCode }, fields: ['id'] });
      if (existing?.[0]?.id) {
        resolvedCustomerId = existing[0].id;
      } else {
        const created = await strapi.entityService.create('api::customer.customer', { data: { customerCode, name: customerCode } });
        resolvedCustomerId = created.id;
      }
    }

    // Load package
    const pkg = await strapi.entityService.findOne('api::pricing-long-term-package.pricing-long-term-package', packageId, {
      fields: ['totalHours', 'price', 'bonusHours', 'name']
    });
    if (!pkg) ctx.throw(404, 'Package not found');

    // Update customer remaining minutes
    const addMinutes = ((pkg.totalHours || 0) + (pkg.bonusHours || 0)) * 60;
    const customer = await strapi.entityService.findOne('api::customer.customer', resolvedCustomerId, { fields: ['remainingMinutes'] });
    const newRemaining = (customer?.remainingMinutes || 0) + addMinutes;
    await strapi.entityService.update('api::customer.customer', resolvedCustomerId, { data: { remainingMinutes: newRemaining } });

    // Create rental record representing package purchase (no timespan)
    const rental = await strapi.entityService.create('api::rental.rental', {
      data: {
        type: 'package',
        customer: resolvedCustomerId,
        package: packageId,
        hours: pkg.totalHours,
        minutes: addMinutes,
        totalAmount: pkg.price,
        startAt: new Date().toISOString(),
        endAt: new Date().toISOString(), // Package purchase is immediate
        note
      }
    });

    ctx.body = { 
      rental, 
      package: pkg,
      remainingMinutes: newRemaining,
      message: 'Package purchased successfully - invoice will be created on settle'
    };
  }
  ,
  async tableStatus(ctx) {
    const tables = await strapi.entityService.findMany('api::table.table', { fields: ['id','code','name'] });
    const activeRentals = await strapi.entityService.findMany('api::rental.rental', {
      filters: { endAt: { $null: true } },
      populate: { customer: true, table: true, rentalAccessories: { populate: { accessory: true } } },
      fields: ['id','startAt','type','hours']
    });
    const tableIdToRental = new Map<number, any>();
    for (const r of activeRentals) {
      const tblId = r.table?.id || r.table;
      if (tblId) tableIdToRental.set(tblId, r);
    }
    ctx.body = tables.map((t:any)=> ({
      id: t.id,
      code: t.code,
      name: t.name,
      status: tableIdToRental.has(t.id) ? 'occupied' : 'free',
      rental: tableIdToRental.get(t.id) || null
    }));
  }
  ,
  async startShortOnTable(ctx) {
    const tableId = Number(ctx.params.tableId);
    const { customerId, customerCode, accessories = [], discount = 0, note } = ctx.request.body || {};
    console.log('startShortOnTable - Request body:', ctx.request.body);
    console.log('startShortOnTable - Discount received:', discount);
    console.log('startShortOnTable - TableId:', tableId);
    if (!tableId || ((!customerId && !customerCode))) ctx.throw(400, 'Missing params');
    
    let resolvedCustomerId = customerId;
    if (resolvedCustomerId) {
      const check = await strapi.entityService.findOne('api::customer.customer', resolvedCustomerId, { fields: ['id'] }).catch(() => null);
      if (!check) {
        // Generate unique customerCode
        const timestamp = Date.now();
        const created = await strapi.entityService.create('api::customer.customer', { data: { customerCode: `KH${timestamp}`, name: `Khách ${timestamp}` } });
        resolvedCustomerId = created.id;
      }
    }
    if (!resolvedCustomerId && customerCode) {
      const existing = await strapi.entityService.findMany('api::customer.customer', { filters: { customerCode: customerCode }, fields: ['id'] });
      if (existing?.[0]?.id) {
        resolvedCustomerId = existing[0].id;
      } else {
        const created = await strapi.entityService.create('api::customer.customer', { data: { customerCode, name: customerCode } });
        resolvedCustomerId = created.id;
      }
    }
    
    // ensure table free
    const existing = await strapi.entityService.findMany('api::rental.rental', { filters: { table: tableId, endAt: { $null: true } }, fields: ['id'] });
    if (existing?.length) ctx.throw(400, 'Table is occupied');
    
    const now = new Date();
    
    // Create rental without hours - will be calculated on settle
    const rentalData: any = {
      type: 'short',
      customer: resolvedCustomerId,
      table: tableId,
      startAt: now,
      hours: 0, // Will be calculated on settle
      minutes: 0, // Will be calculated on settle
      totalAmount: 0, // Will be calculated on settle
      discount: discount, // Store discount for later use
      note
    };
    
    // Ensure startAt is properly formatted
    if (!rentalData.startAt) {
      rentalData.startAt = new Date();
    }
    
    console.log('startShortOnTable - Creating rental with data:', rentalData);
    console.log('startShortOnTable - Discount in rentalData:', rentalData.discount);
    
    const rental = await strapi.entityService.create('api::rental.rental', {
      data: rentalData
    });
    
    // persist accessories as rental-accessories
    if (Array.isArray(accessories) && accessories.length) {
      const accIds = accessories.map((a:any)=>a.accessoryId).filter(Boolean);
      const accItems = await strapi.entityService.findMany('api::accessory.accessory', { filters: { id: { $in: accIds } }, fields: ['id','price'] });
      const priceMap = new Map(accItems.map((i:any)=>[i.id, i.price]));
      for (const a of accessories) {
        const unit = Number(priceMap.get(a.accessoryId) || 0);
        const qty = Number(a.quantity || 1);
        await strapi.entityService.create('api::rental-accessory.rental-accessory', {
          data: {
            rental: rental.id,
            accessory: a.accessoryId,
            unitPrice: unit,
            quantity: qty,
            totalPrice: unit * qty
          }
        });
      }
    }
    
    ctx.body = { rental, message: 'Rental started - will calculate cost on settle' };
  }
  ,
  async settleTable(ctx) {
    const tableId = Number(ctx.params.tableId);
    const { discount = 0 } = ctx.request.body || {};
    if (!tableId) ctx.throw(400, 'tableId required');
    
    console.log('settleTable - Discount received:', discount);
    
    // find active rental
    const rentals = await strapi.entityService.findMany('api::rental.rental', { 
      filters: { table: tableId, endAt: { $null: true } }, 
      populate: { 
        rentalAccessories: { populate: { accessory: true } }, 
        customer: true, 
        table: true 
      } 
    });
    const rental = rentals?.[0];
    if (!rental) ctx.throw(404, 'No active rental');
    
    const endAt = new Date().toISOString();
    const startAt = new Date(rental.startAt);
    const endTime = new Date(endAt);
    
    // Calculate actual minutes used (rounded up to next minute)
    const diffMs = endTime.getTime() - startAt.getTime();
    const actualMinutes = Math.ceil(diffMs / (1000 * 60)); // Round up to next minute
    const actualHours = actualMinutes / 60; // Convert to hours for display
    
    // Normalize customer id (could be populated object or id)
    const customerId = (rental as any)?.customer?.id ?? (rental as any)?.customer;
    // Get customer info for remaining minutes
    const customer = await strapi.entityService.findOne('api::customer.customer', customerId, {
      fields: ['remainingMinutes']
    });
    const remainingMinutes = customer?.remainingMinutes || 0;
    
    // Calculate cost based on new logic (by minutes)
    let totalCost = 0;
    let usedPackageMinutes = 0;
    let paidMinutes = 0;
    
    if (actualMinutes <= remainingMinutes) {
      // Use package minutes completely
      usedPackageMinutes = actualMinutes;
      paidMinutes = 0;
    } else {
      // Use remaining package minutes + pay for extra minutes
      usedPackageMinutes = remainingMinutes;
      paidMinutes = actualMinutes - remainingMinutes;
      
      // Calculate cost based on paid minutes
      // 50k/hour = 833.33/minute, 45k/hour = 750/minute
      const paidHours = paidMinutes / 60;
      let minuteRate = 0;
      if (paidHours <= 3) {
        minuteRate = 50000 / 60; // 833.33/minute
      } else {
        minuteRate = 45000 / 60; // 750/minute
      }
      totalCost = paidMinutes * minuteRate;
    }
    
    // Update customer remaining minutes directly
    const newRemainingMinutes = Math.max(0, remainingMinutes - usedPackageMinutes);
    
    console.log('Package minutes update:', {
      customerId,
      originalRemainingMinutes: remainingMinutes,
      usedPackageMinutes,
      newRemainingMinutes
    });
    
    await strapi.entityService.update('api::customer.customer', customerId, {
      data: { remainingMinutes: newRemainingMinutes }
    });
    
    // Compute accessories lines
    const lines = (rental.rentalAccessories || []).map((ra:any)=> ({
      name: ra.accessory?.name,
      unitPrice: Number(ra.unitPrice || 0),
      quantity: Number(ra.quantity || 0),
      total: Number(ra.totalPrice || (Number(ra.unitPrice||0) * Number(ra.quantity||0)))
    }));
    const accessoriesTotal = lines.reduce((s:number, l:any)=> s + (l.total||0), 0);
    
    const subtotal = totalCost + accessoriesTotal;
    const finalDiscount = Number(discount || 0); // Get discount from request
    const total = subtotal - finalDiscount;
    
    console.log('settleTable - Request discount:', discount);
    console.log('settleTable - Final discount:', finalDiscount);
    console.log('settleTable - Subtotal:', subtotal, 'Total:', total);
    
    // Update rental with calculated values
    const updated = await strapi.entityService.update('api::rental.rental', rental.id, { 
      data: { 
        endAt,
        hours: actualHours, // Keep hours for backward compatibility
        minutes: actualMinutes, // Add minutes field
        totalAmount: total
      } 
    });
    
    // Get customer info for invoice
    const customerInfo = await strapi.entityService.findOne('api::customer.customer', customerId, {
      fields: ['name', 'phone', 'customerCode']
    });

    // Get table name
    const tableName = (rental as any)?.table?.name || (rental as any)?.table?.code || 'Bàn không xác định';

    // Find package purchase for this customer (if any)
    const packageRentals = await strapi.entityService.findMany('api::rental.rental', {
      filters: { 
        customer: customerId, 
        type: 'package',
        startAt: { $gte: rental.startAt } // Package purchased after rental started
      },
      populate: { package: true },
      sort: { startAt: 'desc' },
      limit: 1
    });
    
    const packageInfo = packageRentals?.[0]?.package;
    const packagePrice = packageInfo ? packageRentals[0].totalAmount : 0;
    const finalSubtotal = subtotal + packagePrice;
    const finalTotal = finalSubtotal - finalDiscount;

    // Prepare service details
    const serviceDetails = {
      rental: {
        type: rental.type,
        minutes: actualMinutes,
        hours: actualHours,
        startAt: rental.startAt,
        endAt: endAt,
        cost: totalCost
      },
      accessories: lines.map(line => ({
        name: line.name,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        total: line.total
      })),
      package: packageInfo ? {
        name: packageInfo.name,
        totalHours: packageInfo.totalHours,
        bonusHours: packageInfo.bonusHours,
        price: packagePrice
      } : null,
      pricing: {
        rentalCost: totalCost,
        accessoriesTotal,
        packageTotal: packagePrice,
        subtotal: finalSubtotal,
        discount: finalDiscount,
        total: finalTotal
      }
    };

    // Create invoice
    const invoice = await strapi.entityService.create('api::invoice.invoice', {
      data: {
        code: `INV-${Date.now()}`,
        customer: customerId,
        customerName: customerInfo?.name || 'Khách vãng lai',
        customerPhone: customerInfo?.phone || '',
        customerCode: customerInfo?.customerCode || '',
        rental: rental.id,
        subtotal: finalSubtotal,
        discount: finalDiscount,
        total: finalTotal,
        status: 'unpaid',
        serviceDetails,
        rentalStartAt: rental.startAt,
        rentalEndAt: endAt,
        rentalMinutes: actualMinutes,
        rentalType: rental.type,
        tableName,
        remainingMinutes: newRemainingMinutes
      }
    });
    
    // Bank info
    const bankRaw = await strapi.entityService.findMany('api::bank-info.bank-info', { populate: { qrImage: true } });
    const bank = Array.isArray(bankRaw) ? bankRaw[0] : bankRaw;
    
    ctx.body = {
      rental: updated,
      invoice,
      breakdown: { 
        minutes: actualMinutes,
        hours: actualHours,
        remainingMinutes: newRemainingMinutes,
        remainingHours: Math.floor(newRemainingMinutes / 60) + (newRemainingMinutes % 60) / 60,
        usedPackageMinutes,
        usedPackageHours: usedPackageMinutes / 60,
        paidMinutes,
        paidHours: paidMinutes / 60,
        minuteRate: paidMinutes > 0 ? (paidMinutes / 60 <= 2 ? 50000 / 60 : 45000 / 60) : 0,
        hourlyRate: paidMinutes > 0 ? (paidMinutes / 60 <= 2 ? 50000 : 45000) : 0,
        rentalCost: totalCost,
        accessories: lines, 
        accessoriesTotal,
        package: packageInfo,
        packageTotal: packagePrice,
        subtotal: finalSubtotal, 
        discount: finalDiscount, 
        total: finalTotal 
      },
      bank
    };
  },

  async createManualInvoice(ctx) {
    const { customerId, startAt, endAt, discount = 0, accessories = [] } = ctx.request.body || {};
    
    if (!customerId) ctx.throw(400, 'customerId required');
    if (!startAt) ctx.throw(400, 'startAt required');
    if (!endAt) ctx.throw(400, 'endAt required');
    
    const startTime = new Date(startAt);
    const endTime = new Date(endAt);
    
    if (endTime <= startTime) ctx.throw(400, 'endAt must be after startAt');
    
    // Calculate actual minutes used (rounded up to next minute)
    const diffMs = endTime.getTime() - startTime.getTime();
    const actualMinutes = Math.ceil(diffMs / (1000 * 60)); // Round up to next minute
    const actualHours = actualMinutes / 60; // Convert to hours for display
    
    // Get customer info
    const customer = await strapi.entityService.findOne('api::customer.customer', customerId, {
      fields: ['id', 'name', 'phone', 'customerCode', 'remainingMinutes']
    });
    if (!customer) ctx.throw(404, 'Customer not found');
    
    const remainingMinutes = customer.remainingMinutes || 0;
    
    // Calculate cost based on new logic (by minutes)
    let totalCost = 0;
    let usedPackageMinutes = 0;
    let paidMinutes = 0;
    
    if (actualMinutes <= remainingMinutes) {
      // Use package minutes completely
      usedPackageMinutes = actualMinutes;
      paidMinutes = 0;
    } else {
      // Use remaining package minutes + pay for extra minutes
      usedPackageMinutes = remainingMinutes;
      paidMinutes = actualMinutes - remainingMinutes;
      
      // Calculate cost based on paid minutes
      // 50k/hour = 833.33/minute, 45k/hour = 750/minute
      const paidHours = paidMinutes / 60;
      let minuteRate = 0;
      if (paidHours <= 3) {
        minuteRate = 50000 / 60; // 833.33/minute
      } else {
        minuteRate = 45000 / 60; // 750/minute
      }
      totalCost = paidMinutes * minuteRate;
    }
    
    // Update customer remaining minutes directly
    const newRemainingMinutes = Math.max(0, remainingMinutes - usedPackageMinutes);
    
    await strapi.entityService.update('api::customer.customer', customerId, {
      data: { remainingMinutes: newRemainingMinutes }
    });
    
    // Compute accessories lines
    let accessoriesTotal = 0;
    const accessoriesList = [];
    
    if (Array.isArray(accessories) && accessories.length > 0) {
      for (const acc of accessories) {
        const accessory = await strapi.entityService.findOne('api::accessory.accessory', acc.accessoryId);
        if (accessory) {
          const unitPrice = Number(acc.unitPrice || accessory.price || 0);
          const quantity = Number(acc.quantity || 1);
          const total = unitPrice * quantity;
          accessoriesTotal += total;
          accessoriesList.push({
            name: accessory.name,
            unitPrice,
            quantity,
            total
          });
        }
      }
    }
    
    const subtotal = totalCost + accessoriesTotal;
    const finalDiscount = Number(discount || 0);
    const total = subtotal - finalDiscount;
    
    // Create rental record for manual invoice
    const rental = await strapi.entityService.create('api::rental.rental', {
      data: {
        type: 'short',
        customer: customerId,
        hours: actualHours,
        minutes: actualMinutes,
        totalAmount: total,
        startAt: startAt,
        endAt: endAt
      }
    });
    
    // Create rental accessories if any
    if (accessoriesList.length > 0) {
      for (const acc of accessories) {
        const accessory = await strapi.entityService.findOne('api::accessory.accessory', acc.accessoryId);
        if (accessory) {
          await strapi.entityService.create('api::rental-accessory.rental-accessory', {
            data: {
              rental: rental.id,
              accessory: accessory.id,
              quantity: acc.quantity || 1,
              unitPrice: acc.unitPrice || accessory.price || 0,
              totalPrice: (acc.unitPrice || accessory.price || 0) * (acc.quantity || 1)
            }
          });
        }
      }
    }
    
    // Prepare service details
    const serviceDetails = {
      rental: {
        type: 'short',
        minutes: actualMinutes,
        hours: actualHours,
        startAt: startAt,
        endAt: endAt,
        cost: totalCost
      },
      accessories: accessoriesList,
      package: null,
      pricing: {
        rentalCost: totalCost,
        accessoriesTotal,
        packageTotal: 0,
        subtotal,
        discount: finalDiscount,
        total
      }
    };
    
    // Create invoice
    const invoice = await strapi.entityService.create('api::invoice.invoice', {
      data: {
        code: `INV-${Date.now()}`,
        customer: customerId,
        customerName: customer.name || 'Khách vãng lai',
        customerPhone: customer.phone || '',
        customerCode: customer.customerCode || '',
        rental: rental.id,
        subtotal,
        discount: finalDiscount,
        total,
        status: 'unpaid',
        serviceDetails,
        rentalStartAt: startAt,
        rentalEndAt: endAt,
        rentalMinutes: actualMinutes,
        rentalType: 'short',
        tableName: 'Thủ công',
        remainingMinutes: newRemainingMinutes
      }
    });
    
    // Bank info
    const bankRaw = await strapi.entityService.findMany('api::bank-info.bank-info', { populate: { qrImage: true } });
    const bank = Array.isArray(bankRaw) ? bankRaw[0] : bankRaw;
    
    ctx.body = {
      rental,
      invoice,
      breakdown: {
        minutes: actualMinutes,
        hours: actualHours,
        remainingMinutes: newRemainingMinutes,
        remainingHours: Math.floor(newRemainingMinutes / 60) + (newRemainingMinutes % 60) / 60,
        usedPackageMinutes,
        usedPackageHours: usedPackageMinutes / 60,
        paidMinutes,
        paidHours: paidMinutes / 60,
        minuteRate: paidMinutes > 0 ? (paidMinutes / 60 <= 3 ? 50000 / 60 : 45000 / 60) : 0,
        hourlyRate: paidMinutes > 0 ? (paidMinutes / 60 <= 3 ? 50000 : 45000) : 0,
        rentalCost: totalCost,
        accessories: accessoriesList,
        accessoriesTotal,
        package: null,
        packageTotal: 0,
        subtotal,
        discount: finalDiscount,
        total
      },
      bank
    };
  }
});


