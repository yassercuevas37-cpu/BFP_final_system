const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Report = require('../models/Report');
const User = require('../models/User');

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Submit Report Action
router.post('/submit', upload.single('photo'), async (req, res) => {
  if (!req.session.user) return res.redirect('/auth/login');
  
  const { full_name, contact_number, incident_location, barangay_city, severity, description } = req.body;
  const photo_path = req.file ? `/uploads/${req.file.filename}` : null;
  const report_id = 'BFP-' + Date.now().toString().slice(-6);

  try {
    const report = await Report.create({
      report_id,
      full_name,
      contact_number,
      incident_location,
      barangay_city,
      severity,
      description,
      photo_path,
      userId: req.session.user.id,
      status: 'Pending'
    });
    
    // Notification Management: Send emergency alert to admin contact number
    const adminUser = await User.findOne({ where: { role: 'admin' } });
    const adminContact = adminUser ? adminUser.contact_number : '09123456789';

    console.log(`\n[EMERGENCY ALERT SENT TO ADMIN]`);
    console.log(`To Admin Contact: ${adminContact}`);
    console.log(`Message: URGENT! New ${severity} fire report at ${incident_location}. Reporter: ${full_name} (${contact_number}). Report ID: ${report_id}\n`);
    
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// View Report Details
router.get('/details/:id', async (req, res) => {
  if (!req.session.user) return res.redirect('/auth/login');
  
  try {
    const report = await Report.findByPk(req.params.id);
    if (!report) return res.status(404).send('Report not found');
    
    // Fetch user history
    const userHistory = await Report.findAll({
      where: { userId: report.userId },
      order: [['createdAt', 'DESC']]
    });

    res.render('report_details', { user: req.session.user, report, history: userHistory });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Render Edit Form
router.get('/edit/:id', async (req, res) => {
  if (!req.session.user) return res.redirect('/auth/login');
  
  try {
    const report = await Report.findByPk(req.params.id);
    if (!report) return res.status(404).send('Report not found');
    
    // Check permission: Only the owner of the report can edit (Admins can only view/delete/update status)
    if (report.userId !== req.session.user.id) {
      return res.redirect('/dashboard');
    }

    res.render('edit_report', { user: req.session.user, report });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Update Report Action
router.post('/edit/:id', upload.single('photo'), async (req, res) => {
  if (!req.session.user) return res.redirect('/auth/login');
  
  const { full_name, contact_number, incident_location, barangay_city, severity, description } = req.body;
  
  try {
    const report = await Report.findByPk(req.params.id);
    if (!report) return res.status(404).send('Report not found');

    // Check permission: Only the owner of the report can edit
    if (report.userId !== req.session.user.id) {
      return res.redirect('/dashboard');
    }

    const updateData = {
      full_name,
      contact_number,
      incident_location,
      barangay_city,
      severity,
      description
    };

    if (req.file) {
      updateData.photo_path = `/uploads/${req.file.filename}`;
    }

    await report.update(updateData);
    
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Update Status (Admin Only)
router.post('/update-status/:id', async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') return res.redirect('/dashboard');
  
  const { status } = req.body;
  try {
    await Report.update({ status }, { where: { id: req.params.id } });
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Delete Report (Admin Only)
router.post('/delete/:id', async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') return res.redirect('/dashboard');
  
  try {
    await Report.destroy({ where: { id: req.params.id } });
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
