export default ({ strapi }: { strapi: any }) => ({
  async shortRental(ctx) {
    const { customerId, customerCode, shortTermHours, accessories = [], discount = 0, note } = ctx.request.body || {};
    if ((!customerId && !customerCode) || !shortTermHours) ctx.throw(400, 'customerId/customerCode and shortTermHours are required');

    // resolve customer by id or code (create if code provided and not exists)
    let resolvedCustomerId = customerId;
    if (resolvedCustomerId) {
      const check = await strapi.entityService.findOne('api::customer.customer', resolvedCustomerId, { fields: ['id'] }).catch(() => null);
      if (!check) {
        const created = await strapi.entityService.create('api::customer.customer', { data: { customerCode: String(resolvedCustomerId), name: String(resolvedCustomerId) } });
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
        const created = await strapi.entityService.create('api::customer.customer', { data: { customerCode: String(resolvedCustomerId), name: String(resolvedCustomerId) } });
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

    // Update customer remaining hours
    const addHours = (pkg.totalHours || 0) + (pkg.bonusHours || 0);
    const customer = await strapi.entityService.findOne('api::customer.customer', resolvedCustomerId, { fields: ['remainingHours'] });
    const newRemaining = (customer?.remainingHours || 0) + addHours;
    await strapi.entityService.update('api::customer.customer', resolvedCustomerId, { data: { remainingHours: newRemaining } });

    // Create rental record representing package purchase (no timespan)
    const rental = await strapi.entityService.create('api::rental.rental', {
      data: {
        type: 'package',
        customer: resolvedCustomerId,
        package: packageId,
        hours: pkg.totalHours,
        totalAmount: total,
        note
      }
    });

    // Create invoice
    const invoice = await strapi.entityService.create('api::invoice.invoice', {
      data: {
        code: `INV-${Date.now()}`,
        customer: resolvedCustomerId,
        rental: rental.id,
        subtotal,
        discount: discountValue,
        total,
        status: 'unpaid'
      }
    });

    ctx.body = { rental, invoice, remainingHours: newRemaining };
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
    console.log('startShortOnTable - TableId:', tableId);
    if (!tableId || ((!customerId && !customerCode))) ctx.throw(400, 'Missing params');
    
    let resolvedCustomerId = customerId;
    if (resolvedCustomerId) {
      const check = await strapi.entityService.findOne('api::customer.customer', resolvedCustomerId, { fields: ['id'] }).catch(() => null);
      if (!check) {
        const created = await strapi.entityService.create('api::customer.customer', { data: { customerCode: String(resolvedCustomerId), name: String(resolvedCustomerId) } });
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
      totalAmount: 0, // Will be calculated on settle
      note
    };
    
    // Ensure startAt is properly formatted
    if (!rentalData.startAt) {
      rentalData.startAt = new Date();
    }
    
    console.log('startShortOnTable - Creating rental with data:', rentalData);
    
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
    if (!tableId) ctx.throw(400, 'tableId required');
    
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
    
    // Calculate actual hours used (rounded up to next hour)
    const diffMs = endTime.getTime() - startAt.getTime();
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60)); // Round up to next hour
    const actualHours = Math.max(1, diffHours); // Minimum 1 hour
    
    // Normalize customer id (could be populated object or id)
    const customerId = (rental as any)?.customer?.id ?? (rental as any)?.customer;
    // Get customer info for remaining hours
    const customer = await strapi.entityService.findOne('api::customer.customer', customerId, {
      fields: ['remainingHours']
    });
    const remainingHours = customer?.remainingHours || 0;
    
    // Calculate cost based on new logic
    let totalCost = 0;
    let usedPackageHours = 0;
    let paidHours = 0;
    
    if (actualHours <= remainingHours) {
      // Use package hours completely
      usedPackageHours = actualHours;
      paidHours = 0;
    } else {
      // Use remaining package hours + pay for extra hours
      usedPackageHours = remainingHours;
      paidHours = actualHours - remainingHours;
      
      // Calculate cost based on paid hours
      if (paidHours >= 1 && paidHours <= 2) {
        totalCost = paidHours * 50000;
      } else if (paidHours >= 3 && paidHours <= 9) {
        totalCost = paidHours * 45000;
      } else if (paidHours > 9) {
        totalCost = paidHours * 45000;
      }
    }
    
    // Update customer remaining hours
    const newRemainingHours = Math.max(0, remainingHours - usedPackageHours);
    await strapi.entityService.update('api::customer.customer', customerId, {
      data: { remainingHours: newRemainingHours }
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
    const discount = 0; // Could be applied from rental data
    const total = subtotal - discount;
    
    // Update rental with calculated values
    const updated = await strapi.entityService.update('api::rental.rental', rental.id, { 
      data: { 
        endAt,
        hours: actualHours,
        totalAmount: total
      } 
    });
    
    // Create invoice
    const invoice = await strapi.entityService.create('api::invoice.invoice', {
      data: {
        code: `INV-${Date.now()}`,
        customer: customerId,
        rental: rental.id,
        subtotal,
        discount,
        total,
        status: 'unpaid'
      }
    });
    
    // Bank info
    const bankRaw = await strapi.entityService.findMany('api::bank-info.bank-info', { populate: { qrImage: true } });
    const bank = Array.isArray(bankRaw) ? bankRaw[0] : bankRaw;
    
    ctx.body = {
      rental: updated,
      invoice,
      breakdown: { 
        hours: actualHours,
        remainingHours: newRemainingHours,
        usedPackageHours,
        paidHours,
        hourlyRate: paidHours > 0 ? (paidHours <= 2 ? 50000 : 45000) : 0,
        rentalCost: totalCost,
        accessories: lines, 
        accessoriesTotal, 
        subtotal, 
        discount, 
        total 
      },
      bank
    };
  }
});


