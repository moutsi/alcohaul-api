const { Client } = require('pg');

// Initialize the PostgreSQL client
const client = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Connect to the database
async function connectToDatabase() {
  await client.connect();
}

// Disconnect from the database
async function disconnectFromDatabase() {
  await client.end();
}

// Retrieve all records from a table
async function getAllRecordsFromTable(tableName) {
  try {
    const result = await client.query(`SELECT * FROM ${tableName}`);
    return result.rows;
  } catch (error) {
    console.error('Error fetching records:', error);
    throw error;
  }
}

// Insert a record into a table
async function insertRecordIntoTable(tableName, data) {
  try {
    const fields = Object.keys(data).join(', ');
    const values = Object.values(data).map((value, index) => `$${index + 1}`).join(', ');

    const insertQuery = `INSERT INTO ${tableName} (${fields}) VALUES (${values})`;
    await client.query(insertQuery, Object.values(data));
  } catch (error) {
    console.error('Error inserting record:', error);
    throw error;
  }
}

// Update a record in a table
async function updateRecordInTable(tableName, recordId, data) {
  try {
    const updateFields = Object.keys(data).map((key, index) => `${key} = $${index + 1}`).join(', ');

    const updateQuery = `UPDATE ${tableName} SET ${updateFields} WHERE id = $${Object.keys(data).length + 1}`;
    await client.query(updateQuery, [...Object.values(data), recordId]);
  } catch (error) {
    console.error('Error updating record:', error);
    throw error;
  }
}

// Delete a record from a table
async function deleteRecordFromTable(tableName, recordId) {
  try {
    const deleteQuery = `DELETE FROM ${tableName} WHERE id = $1`;
    await client.query(deleteQuery, [recordId]);
  } catch (error) {
    console.error('Error deleting record:', error);
    throw error;
  }
}

module.exports = {
  connectToDatabase,
  disconnectFromDatabase,
  getAllRecordsFromTable,
  insertRecordIntoTable,
  updateRecordInTable,
  deleteRecordFromTable,
};
