const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// SQLite Database setup
const db = new sqlite3.Database(path.join(__dirname, 'pet_care.db'), (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database');
    }
});

// Initialize the database schema if not exists
db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS pets (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, breed TEXT, age INTEGER, description TEXT, pet_type TEXT, image_url TEXT, address TEXT)");
});

// Set up multer for image uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir); // Create uploads folder if it doesn't exist
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // Rename file with a timestamp to avoid overwriting
    }
});

const upload = multer({ storage: storage });

// Routes for frontend pages
app.get('/', (req, res) => {
    db.all("SELECT * FROM pets", (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.render('index', { pets: rows });
        }
    });
});

app.get('/add', (req, res) => {
    res.render('addPet');
});

app.get('/edit/:id', (req, res) => {
    const { id } = req.params;
    db.get("SELECT * FROM pets WHERE id = ?", [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.render('editPet', { pet: row });
        }
    });
});

// Route to view a single pet's details
app.get('/view/:id', (req, res) => {
    const { id } = req.params; // Extract the pet ID from the URL
    db.get("SELECT * FROM pets WHERE id = ?", [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            // Render the 'viewPet' template and pass the pet details to it
            res.render('viewPet', { pet: row });
        }
    });
});

// CRUD Routes
app.post('/pets', upload.single('image'), (req, res) => {
    const { name, breed, age, description, pet_type, address } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null; // Store the path of the uploaded image

    db.run("INSERT INTO pets (name, breed, age, description, pet_type, image_url, address) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [name, breed, age, description, pet_type, imageUrl, address], function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.redirect('/');
            }
        });
});

app.post('/pets/:id', upload.single('image'), (req, res) => {
    const { id } = req.params;
    const { name, breed, age, description, pet_type, address } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    db.run("UPDATE pets SET name = ?, breed = ?, age = ?, description = ?, pet_type = ?, image_url = ?, address = ? WHERE id = ?",
        [name, breed, age, description, pet_type, imageUrl, address, id], function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.redirect('/');
            }
        });
});

app.get('/delete/:id', (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM pets WHERE id = ?", [id], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.redirect('/');
        }
    });
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
