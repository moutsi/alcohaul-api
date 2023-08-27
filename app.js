const express = require('express');
const { Client } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

const client = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

client.connect();

app.use(express.json());

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

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
