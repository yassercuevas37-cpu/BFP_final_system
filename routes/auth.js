const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.role === 'admin') {
    next();
  } else {
    res.status(403).send('Access denied. Admins only.');
  }
};

// Login Page
router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// Register Page
router.get('/register', (req, res) => {
  res.render('register', { error: null });
});

// Login Action
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  console.log(`[AUTH] Login attempt for username: ${username}`);
  
  try {
    const user = await User.findOne({ where: { username } });
    
    if (!user) {
      console.log(`[AUTH] User not found: ${username}`);
      return res.render('login', { error: 'Invalid username or password' });
    }

    console.log(`[AUTH] User found: ${user.username}, hashing/comparing password...`);
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (isMatch) {
      console.log(`[AUTH] Password match for: ${username}`);
      req.session.user = { 
        id: user.id, 
        username: user.username, 
        role: user.role 
      };
      
      // Save session explicitly to avoid race conditions with redirect
      req.session.save((err) => {
        if (err) {
          console.error(`[AUTH] Session save error:`, err);
          return res.render('login', { error: 'An error occurred during session creation' });
        }
        console.log(`[AUTH] Session created for: ${username}, redirecting to dashboard`);
        res.redirect('/dashboard');
      });
    } else {
      console.log(`[AUTH] Password mismatch for: ${username}`);
      res.render('login', { error: 'Invalid username or password' });
    }
  } catch (err) {
    console.error(`[AUTH] Login error:`, err);
    res.render('login', { error: 'An error occurred during login' });
  }
});

// Register Action
router.post('/register', async (req, res) => {
  const { username, password, contact_number, adminRequest } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Force role to 'user' for all public registrations
    // If adminRequest is checked, set adminRequest to 'pending'
    const newUser = await User.create({ 
      username, 
      password: hashedPassword, 
      role: 'user', 
      contact_number,
      adminRequest: adminRequest === 'on' ? 'pending' : 'none',
      isApproved: true // Regular users are approved by default
    });
    
    res.render('login', { error: 'Registration successful! Please login.' });
  } catch (err) {
    console.error(err);
    res.render('register', { error: 'Username already exists or invalid data' });
  }
});

// Admin Approval Routes
router.post('/approve-admin/:id', isAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).send('User not found');

    await user.update({
      role: 'admin',
      adminRequest: 'approved'
    });

    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/reject-admin/:id', isAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).send('User not found');

    await user.update({
      adminRequest: 'rejected'
    });

    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Profile Page
router.get('/profile', async (req, res) => {
  if (!req.session.user) return res.redirect('/auth/login');
  try {
    const user = await User.findByPk(req.session.user.id);
    res.render('profile', { user, error: null, success: null });
  } catch (err) {
    res.redirect('/dashboard');
  }
});

// Update Profile Action
router.post('/profile', async (req, res) => {
  if (!req.session.user) return res.redirect('/auth/login');
  const { username, contact_number, new_password } = req.body;
  
  try {
    const user = await User.findByPk(req.session.user.id);
    if (username !== user.username) {
      const existingUser = await User.findOne({ where: { username } });
      if (existingUser) {
        return res.render('profile', { user, error: 'Username already taken', success: null });
      }
    }

    const updateData = { username, contact_number };
    if (new_password && new_password.trim() !== '') {
      updateData.password = await bcrypt.hash(new_password, 10);
    }

    await user.update(updateData);
    req.session.user.username = username;
    res.render('profile', { user, error: null, success: 'Profile updated successfully' });
  } catch (err) {
    res.render('profile', { user, error: 'Failed to update profile', success: null });
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/auth/login');
});

module.exports = router;
