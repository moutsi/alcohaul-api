const express = require('express');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require ('bcrypt');
require ('dotenv').config();
const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false, // Set to false if using a self-signed certificate
  },
  max: 60,
});



app.use(express.json());
 
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
  const { email, password } = req.body;
  try {
    await pool.connect();
    
  } catch (error) {
    console.error('Error connecting to the database:', error);
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const insertQuery = 'INSERT INTO \"user\" (email, password) VALUES ($1, $2)';
    await pool.query(insertQuery, [email, hashedPassword]);
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET);
    res.status(201).json({ 
      message: 'User registered successfully',
      token: token
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// User Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    await pool.connect();
   
  } catch (error) {
    console.error('Error connecting to the database:', error);
  }
  try {
    const query = 'SELECT * FROM "users" WHERE email = $1';
    const result = await pool.query(query, [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Authentication failed' });
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Authentication failed' });
    }
    
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET);
    res.json({ token });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// Retrieve a single record from a table by ID
app.get('/data/:table/:id', async (req, res) => {
  const { table, id } = req.params;
  try {
    await pool.connect();
  } catch (error) {
    console.error('Error connecting to the database:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
  try {
    const result = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Record not found' });
    }
    res.json( {record: result.rows[0]});
  } catch (error) {
    console.error('Error fetching record:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});


// Retrieve all records from a table
// Query records from a table with filters
app.get('/data/:table', async (req, res) => {
  const { table } = req.params;
  const filters = req.query;

  try {
    await pool.connect();
  } catch (error) {
    console.error('Error connecting to the database:', error);
    res.status(500).json({ error: 'An error occurred' });
  }

  try {
    let query = `SELECT * FROM ${table}`;
    let values = [];
    let index = 1;

    if (Object.keys(filters).length > 0) {
      query += ' WHERE ';
      for (const key in filters) {
        query += `${key} = $${index} AND `;
        values.push(filters[key]);
        index++;
      }
      query = query.slice(0, -5); // Remove the trailing 'AND'
    }

    const result = await pool.query(query, values);
    const response = {results: result.rows}
    res.json(response);
  } catch (error) {
    console.error('Error fetching records:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});


// Insert a record into a table
app.post('/data/:table', async (req, res) => {
  const { table } = req.params;
  const data = req.body;
  try {
    const client = await pool.connect();
    const fields = Object.keys(data).join(', ');
    const values = Object.values(data).map((value, index) => `$${index + 1}`).join(', ');

    const insertQuery = `INSERT INTO ${table} (${fields}) VALUES (${values}) RETURNING *`;
    const result = await client.query(insertQuery, Object.values(data));
    console.log(insertQuery);

    client.release();

    res.status(201).json({ message: 'Record created successfully', insertedRecord: result.rows[0] });
    console.log(result.rows[0])
  } catch (error) {
    console.error('Error inserting record:', error);
    res.status(500).json({ error: 'An error occurred' });
  }

});



// Update a record in a table
app.put('/data/:table/:id', async (req, res) => {
  const { table, id } = req.params;
  const data = req.body;
  try {
    await pool.connect();
    
  } catch (error) {
    console.error('Error connecting to the database:', error);
  };
  try {
    const updateFields = Object.keys(data).map((key, index) => `${key} = $${index + 1}`).join(', ');

    const updateQuery = `UPDATE ${table} SET ${updateFields} WHERE id = $${Object.keys(data).length + 1}`;
    await pool.query(updateQuery, [...Object.values(data), id]);

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
    await pool.connect();
   
  } catch (error) {
    console.error('Error connecting to the database:', error);
  };
  try {
    const createTableQuery = `CREATE TABLE ${tableName} (${fields})`;
    await pool.query(createTableQuery);
    
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
    await pool.connect();
    
  } catch (error) {
    console.error('Error connecting to the database:', error);
  };
  try {
    // addFieldsQuery = `ALTER TABLE ${table} RENAME TO ${fields}`
    const addFieldsQuery = `ALTER TABLE ${table} ${fields}` 
    //const addFieldsQuery = `ALTER TABLE ${table} ADD COLUMN ${fields}`;
    await pool.query(addFieldsQuery);
    
    res.status(201).json({ message: 'Fields added to table successfully' });
  } catch (error) {
    console.error('Error adding fields to table:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});


// Delete a record from a table
app.delete('/data/:table/:id', async (req, res) => {
  const { table, id } = req.params;
  try {
    await pool.connect();
    
  } catch (error) {
    console.error('Error connecting to the database:', error);
  };
  try {
    const deleteQuery = `DELETE FROM ${table} WHERE id = $1`;
    await pool.query(deleteQuery, [id]);

    res.json({ message: 'Record deleted successfully' });
  } catch (error) {
    console.error('Error deleting record:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

//get the database schema
app.get('/schema', async (req, res) => {
  try {
    const client = await pool.connect();

    const query = `
      SELECT
        table_schema,
        table_name,
        column_name,
        data_type
      FROM
        information_schema.columns
      WHERE
        table_schema = 'public'; 
    `;

    const result = await client.query(query);
    const schemaInfo = {};

    result.rows.forEach(row => {
      const { table_schema, table_name, column_name, data_type } = row;
      if (!schemaInfo[table_name]) {
        schemaInfo[table_name] = {
          table_schema,
          columns: [],
        };
      }
      schemaInfo[table_name].columns.push({ column_name, data_type });
    });

    client.release();

    res.json(schemaInfo);
  } catch (error) {
    console.error('Error retrieving schema information:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

process.on('SIGINT', async () => {
  await pool.end();
  process.exit();
}); 


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
