// Migration script to convert remainingHours to remainingMinutes
// Run this script after updating the schema

const { createStrapi } = require('@strapi/strapi');

async function migrateRemainingHoursToMinutes() {
  console.log('Starting migration from remainingHours to remainingMinutes...');
  
  try {
    // Get all customers with remainingHours
    const customers = await strapi.entityService.findMany('api::customer.customer', {
      fields: ['id', 'remainingHours'],
      filters: {
        remainingHours: { $gt: 0 }
      }
    });
    
    console.log(`Found ${customers.length} customers with remainingHours > 0`);
    
    for (const customer of customers) {
      const remainingMinutes = Math.round(customer.remainingHours * 60);
      
      console.log(`Migrating customer ${customer.id}: ${customer.remainingHours}h -> ${remainingMinutes} minutes`);
      
      await strapi.entityService.update('api::customer.customer', customer.id, {
        data: { 
          remainingMinutes: remainingMinutes,
          remainingHours: 0 // Clear old field
        }
      });
    }
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateRemainingHoursToMinutes()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateRemainingHoursToMinutes };
