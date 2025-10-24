// Migration script to convert rental hours to minutes
// Run this script after updating the rental schema

const { createStrapi } = require('@strapi/strapi');

async function migrateRentalHoursToMinutes() {
  console.log('Starting migration from rental hours to minutes...');
  
  try {
    // Get all rentals with hours > 0
    const rentals = await strapi.entityService.findMany('api::rental.rental', {
      fields: ['id', 'hours'],
      filters: {
        hours: { $gt: 0 }
      }
    });
    
    console.log(`Found ${rentals.length} rentals with hours > 0`);
    
    for (const rental of rentals) {
      const minutes = Math.round(rental.hours * 60);
      
      console.log(`Migrating rental ${rental.id}: ${rental.hours}h -> ${minutes} minutes`);
      
      await strapi.entityService.update('api::rental.rental', rental.id, {
        data: { 
          minutes: minutes
        }
      });
    }
    
    console.log('Rental migration completed successfully!');
  } catch (error) {
    console.error('Rental migration failed:', error);
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateRentalHoursToMinutes()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Rental migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateRentalHoursToMinutes };
