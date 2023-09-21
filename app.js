const express = require('express');
const { Client } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require ('bcrypt');
require ('dotenv').config();
const app = express();
const port = process.env.PORT || 3000;

const client = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false, // Set to false if using a self-signed certificate
  }
});



app.use(express.json());
app.use(async (req, res, next) => {
  try {
    await client.connect();
    next();
  } catch (error) {
    console.error('Error connecting to the database:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});
function authenticateToken(req, res, next) {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ message: 'Access denied' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
}

// User Registration
app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const insertQuery = 'INSERT INTO users (username, password) VALUES ($1, $2)';
    await client.query(insertQuery, [username, hashedPassword]);
    
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// User Login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const query = 'SELECT * FROM users WHERE username = $1';
    const result = await client.query(query, [username]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Authentication failed' });
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Authentication failed' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET);
    res.json({ token });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});



// Retrieve all records from a table
app.get('/:table', async (req, res) => {
  const { table } = req.params;
  try {
    const result = await client.query(`SELECT * FROM ${table}`);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching records:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// Insert a record into a table
app.post('/:table', async (req, res) => {
  const { table } = req.params;
  const data = req.body;

  try {
    const fields = Object.keys(data).join(', ');
    const values = Object.values(data).map((value, index) => `$${index + 1}`).join(', ');

    const insertQuery = `INSERT INTO ${table} (${fields}) VALUES (${values})`;
    await client.query(insertQuery, Object.values(data));

    res.status(201).json({ message: 'Record created successfully' });
  } catch (error) {
    console.error('Error inserting record:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// Update a record in a table
app.put('/:table/:id', async (req, res) => {
  const { table, id } = req.params;
  const data = req.body;

  try {
    const updateFields = Object.keys(data).map((key, index) => `${key} = $${index + 1}`).join(', ');

    const updateQuery = `UPDATE ${table} SET ${updateFields} WHERE id = $${Object.keys(data).length + 1}`;
    await client.query(updateQuery, [...Object.values(data), id]);

    res.json({ message: 'Record updated successfully' });
  } catch (error) {
    console.error('Error updating record:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});
// Create a new table
app.post('/create-table', async (req, res) => {
  const { tableName, fields } = req.body;

  try {
    const createTableQuery = `CREATE TABLE ${tableName} (${fields})`;
    await client.query(createTableQuery);
    
    res.status(201).json({ message: 'Table created successfully' });
  } catch (error) {
    console.error('Error creating table:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// Add fields to an existing table
app.post('/add-fields/:table', async (req, res) => {
  const { table } = req.params;
  const { fields } = req.body;

  try {
    const addFieldsQuery = `ALTER TABLE ${table} ADD COLUMN ${fields}`;
    await client.query(addFieldsQuery);
    
    res.status(201).json({ message: 'Fields added to table successfully' });
  } catch (error) {
    console.error('Error adding fields to table:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});


// Delete a record from a table
app.delete('/:table/:id', async (req, res) => {
  const { table, id } = req.params;

  try {
    const deleteQuery = `DELETE FROM ${table} WHERE id = $1`;
    await client.query(deleteQuery, [id]);

    res.json({ message: 'Record deleted successfully' });
  } catch (error) {
    console.error('Error deleting record:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

  try {
    client.end();
  } catch (error) {
    console.error('Error disconnecting from the database:', error);
  }


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
