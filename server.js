require('dotenv').config();

// Import necessary modules
const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Create an instance of express for our app
const app = express();

// Define the port to run the server on
const port = process.env.PORT || 3000;

// Middleware to parse URL-encoded bodies (as sent by HTML forms)
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware to parse JSON bodies (as sent by API clients)
app.use(bodyParser.json());

// Middleware to enable CORS (Cross-Origin Resource Sharing)
app.use(cors());

// Security Middleware
app.use(helmet());
app.use(compression());
app.use(rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
}));

// Serve static files from the "public" and "game images" directories
app.use(express.static(path.join(__dirname, 'public')));
app.use('/game-images', express.static(path.join(__dirname, 'game images')));

// Serve React frontend in production
app.use(express.static(path.join(__dirname, '../frontend/build')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

// Create a connection to the MySQL database using configuration from environment variables
const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

// Connect to the MySQL server
connection.connect(err => {
    if (err) {
        console.error('Error connecting to MySQL Server:', err.message);
        console.error('Details:', err);
        process.exit(1); // Exit the process with an error code
    }
    console.log('Connected to MySQL Server!');
});

// Define a route to fetch data for a single video game by its ID
app.get('/videogames/:id', (req, res) => {
    const { id } = req.params;
    const query = 'SELECT * FROM videogames WHERE id = ?';
    connection.query(query, [id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (results.length === 0) {
            return res.json({ message: 'Game not found' });
        }
        res.json(results[0]);
    });
});

// Define a route to fetch all video games optionally filtered by query parameters
app.get('/videogames', (req, res) => {
    const { title, developer, publisher, genre, platform } = req.query;

    // Construct the SQL query dynamically
    let query = 'SELECT * FROM videogames';
    const queryParams = [];
    if (title || developer || publisher || genre || platform) {
        query += ' WHERE ';
        const conditions = [];
        if (title) {
            conditions.push('title LIKE ?');
            queryParams.push(`%${title}%`);
        }
        if (developer) {
            conditions.push('developer LIKE ?');
            queryParams.push(`%${developer}%`);
        }
        if (publisher) {
            conditions.push('publisher LIKE ?');
            queryParams.push(`%${publisher}%`);
        }
        if (genre) {
            conditions.push('genre LIKE ?');
            queryParams.push(`%${genre}%`);
        }
        if (platform) {
            conditions.push('platform LIKE ?');
            queryParams.push(`%${platform}%`);
        }
        query += conditions.join(' AND ');
    }

    connection.query(query, queryParams, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// Define a route to fetch artwork URL for a specific video game by its ID
app.get('/videogames/:id/artwork', (req, res) => {
    const { id } = req.params;
    const query = 'SELECT artwork_url FROM videogames WHERE id = ?';
    connection.query(query, [id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Game not found' });
        }
        const artworkUrl = results[0].artwork_url;
        res.json({ artworkUrl });
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});