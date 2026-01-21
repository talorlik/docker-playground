const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const os = require('os');
const app = express();
const PORT = process.env.PORT || 8000;
const HOSTNAME = os.hostname();

app.use(cors());
app.use(express.json());

// Database connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'db-primary',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'myapp',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Validation middleware
const validateUser = (req, res, next) => {
  const { name, surname, email, sex, age } = req.body;
  const errors = [];

  // Required fields validation
  if (!name || name.trim() === '') {
    errors.push('Name is required');
  }
  if (!surname || surname.trim() === '') {
    errors.push('Surname is required');
  }
  if (!email || email.trim() === '') {
    errors.push('Email is required');
  } else if (!emailRegex.test(email)) {
    errors.push('Email format is invalid');
  }

  // Optional fields validation
  if (age !== undefined && age !== null) {
    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 0 || ageNum > 150) {
      errors.push('Age must be a valid number between 0 and 150');
    }
  }

  if (sex && !['male', 'female', 'other'].includes(sex.toLowerCase())) {
    errors.push('Sex must be one of: male, female, other');
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};

app.get('/', (req, res) => {
  res.json({ 
    message: 'Backend service is running!',
    instance: HOSTNAME,
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    instance: HOSTNAME
  });
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, surname, sex, age, email, created_at FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create a new user
app.post('/api/users', validateUser, async (req, res) => {
  try {
    const { name, surname, email, sex, age } = req.body;
    
    const result = await pool.query(
      'INSERT INTO users (name, surname, email, sex, age) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, surname, sex, age, email, created_at',
      [name.trim(), surname.trim(), email.trim(), sex || null, age ? parseInt(age) : null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating user:', error);
    if (error.code === '23505') { // Unique violation
      res.status(409).json({ error: 'Email already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create user' });
    }
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server (${HOSTNAME}) running on port ${PORT}`);
});
