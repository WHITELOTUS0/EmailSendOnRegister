const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('./db');
const router = express.Router();

// Route for user registration
router.post('/', (req, res) => {
  const { email, password } = req.body;

  // Check if email already exists
  pool.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err) throw err;

    if (results.length > 0) {
      return res.status(400).send('Email already registered');
    }

    // Generate password hash
    bcrypt.genSalt(10, (err, salt) => {
      bcrypt.hash(password, salt, (err, hash) => {
        if (err) throw err;

        // Store user data
        const newUser = { email, password: hash };
        pool.query('INSERT INTO users SET ?', newUser, (err) => {
          if (err) throw err;

          res.send('Registration successful');
        });
      });
    });
  });
});

module.exports = router;
