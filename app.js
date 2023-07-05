const express = require('express');
const mysql = require('mysql2');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Create MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10,
});

// User data table name
const userTable = 'users';

// Route for user registration
app.post('/register', (req, res) => {
  const { email, password } = req.body;

  // Check if email already exists
  pool.query(`SELECT * FROM ${userTable} WHERE email = ?`, [email], (err, results) => {
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
        pool.query(`INSERT INTO ${userTable} SET ?`, newUser, (err) => {
          if (err) throw err;

          // Send registration email with a link
          const link = `http://localhost:3000/confirm/${email}`;
          sendEmail(email, 'Confirm your email', `Click the following link to confirm your email: ${link}`);

          res.send('Registration successful. Please check your email for confirmation.');
        });
      });
    });
  });
});

// Route for email confirmation
app.get('/confirm/:email', (req, res) => {
  const { email } = req.params;

  // Check if the email exists in the user database
  pool.query(`SELECT * FROM ${userTable} WHERE email = ?`, [email], (err, results) => {
    if (err) throw err;

    if (results.length === 0) {
      return res.status(404).send('User not found');
    }

    // Check if the user has already confirmed the email
    const user = results[0];
    if (user.confirmed) {
      return res.send('Email already confirmed');
    }

    // Mark email as confirmed
    pool.query(`UPDATE ${userTable} SET confirmed = 1 WHERE email = ?`, [email], (err) => {
      if (err) throw err;

      res.send('Email confirmed. Please log in with your password.');
    });
  });
});

// Route for user login
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  // Check if email exists in the user database
  pool.query(`SELECT * FROM ${userTable} WHERE email = ?`, [email], (err, results) => {
    if (err) throw err;

    if (results.length === 0) {
      return res.status(404).send('User not found');
    }

    const user = results[0];

    // Check if the user has confirmed their email
    if (!user.confirmed) {
      return res.status(400).send('Email not confirmed');
    }

    // Compare the provided password with the stored hash
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) throw err;

      if (isMatch) {
        res.send('Login successful');
      } else {
        res.status(401).send('Incorrect password');
      }
    });
  });
});

// Function to send email using Nodemailer
function sendEmail(to, subject, text) {
  const transporter = nodemailer.createTransport({
    service: 'YourEmailServiceProvider',
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USERNAME,
    to,
    subject,
    text,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log(`Email sent: ${info.response}`);
    }
  });
}

// Start the server
const port = 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
