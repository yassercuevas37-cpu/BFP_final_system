const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Report = require('./models/Report');
const sequelize = require('./db');

async function seed() {
  try {
    console.log('[SEED] Starting database seeding...');
    await sequelize.sync({ force: true });
    console.log('[SEED] Tables dropped and recreated.');
    
    const adminHashedPassword = await bcrypt.hash('admin123', 10);
    console.log('[SEED] Admin password hashed.');
    const admin = await User.create({
      username: 'admin',
      password: adminHashedPassword,
      role: 'admin',
      contact_number: '09123456789',
      isApproved: true,
      adminRequest: 'approved'
    });
    console.log('[SEED] Admin user created.');

    const userHashedPassword = await bcrypt.hash('user123', 10);
    console.log('[SEED] Regular user password hashed.');
    const user = await User.create({
      username: 'user',
      password: userHashedPassword,
      role: 'user',
      contact_number: '09987654321',
      isApproved: true,
      adminRequest: 'none'
    });
    console.log('[SEED] Regular user created.');

    // Sample Reports
    await Report.create({
      report_id: 'BFP-DEMO01',
      full_name: 'Test User',
      contact_number: '09111111111',
      incident_location: 'Manila City Hall',
      barangay_city: 'Manila',
      severity: 'High',
      status: 'Pending',
      userId: user.id
    });
    console.log('[SEED] Sample report created.');

    console.log('[SEED] Database seeded successfully with admin, user, and reports');
    process.exit(0);
  } catch (err) {
    console.error('[SEED] Error during seeding:', err);
    process.exit(1);
  }
}

seed();
