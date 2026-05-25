require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const sequelize = require('./db');
const User = require('./models/User');
const Report = require('./models/Report');

// Associations
User.hasMany(Report, { foreignKey: 'userId' });
Report.belongsTo(User, { foreignKey: 'userId' });

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.set('view engine', 'ejs');

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'bfp-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true if using HTTPS
}));

// Sync Database
sequelize.sync({ force: false }).then(() => {
  console.log('Database synced');
}).catch(err => {
  console.error('Failed to sync database:', err);
});

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/reports', require('./routes/reports'));

// Home redirect
app.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.redirect('/auth/login');
});

// Dashboard Route
app.get('/dashboard', async (req, res) => {
  if (!req.session.user) return res.redirect('/auth/login');
  
  try {
    const user = req.session.user;
    
    if (user.role === 'admin') {
      const allReports = await Report.findAll({ order: [['createdAt', 'DESC']] });
      const adminRequests = await User.findAll({ 
        where: { adminRequest: 'pending' },
        order: [['createdAt', 'DESC']]
      });

      const allAdmins = await User.findAll({
        where: { role: 'admin' },
        order: [['username', 'ASC']]
      });
      
      const stats = {
        totalReports: allReports.length,
        pending: allReports.filter(r => r.status === 'Pending').length,
        responding: allReports.filter(r => r.status === 'Responding').length,
        resolved: allReports.filter(r => r.status === 'Resolved').length
      };
      res.render('admin_dashboard', { user, reports: allReports, stats, adminRequests, allAdmins });
    } else {
      const myReports = await Report.findAll({ 
        where: { userId: user.id },
        order: [['createdAt', 'DESC']]
      });

      const stats = {
        total: myReports.length,
        resolved: myReports.filter(r => r.status === 'Resolved').length
      };
      res.render('user_dashboard', { user, reports: myReports, stats });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

app.get('/submit-report', (req, res) => {
  if (!req.session.user) return res.redirect('/auth/login');
  res.render('submit_report', { user: req.session.user });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
