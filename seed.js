const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Report = require('./models/Report');
const sequelize = require('./db');

async function seed() {
  await sequelize.sync({ force: true });
  
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await User.create({
    username: 'admin',
    password: hashedPassword,
    role: 'admin',
    contact_number: '09123456789',
    isApproved: true,
    adminRequest: 'approved'
  });

  const userPassword = await bcrypt.hash('user123', 10);
  const user = await User.create({
    username: 'user',
    password: userPassword,
    role: 'user',
    contact_number: '09987654321',
    isApproved: true,
    adminRequest: 'none'
  });

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

  console.log('Database seeded with admin, user, and reports');
  process.exit();
}

seed();
