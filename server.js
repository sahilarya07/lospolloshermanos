const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true }); // Create 'uploads' folder if it doesn't exist
}

// Set up Multer storage engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // Store images in the 'uploads' folder inside 'public'
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Use timestamp as the file name
  }
});
const upload = multer({ storage: storage });

// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Connect to MongoDB
// Connect to MongoDB (Cloud)
mongoose.connect('mongodb+srv://newuser:newuser@cluster0.ffpaa.mongodb.net/crudApp?retryWrites=true&w=majority&appName=Cluster0', {
  useUnifiedTopology: true
})
  .then(() => {
    console.log("MongoDB connected successfully to the cloud.");
  })
  .catch(err => {
    console.log("MongoDB connection error:", err);
  });


// Create a Schema for Data
const itemSchema = new mongoose.Schema({
  name: String,
  description: String,
  image: String // Add image field to store image path
});

const Item = mongoose.model('Item', itemSchema);

// Routes
app.get('/', async (req, res) => {
  try {
    const items = await Item.find({});
    res.render('index', { items });
  } catch (err) {
    console.log(err);
    res.status(500).send('Error retrieving items');
  }
});

// Route to show the form to add a new item
app.get('/add', (req, res) => {
  res.render('add');
});

// Create item (including image upload)
app.post('/add', upload.single('image'), async (req, res) => {
  const { name, description } = req.body;
  const imagePath = req.file ? '/uploads/' + req.file.filename : undefined; // Save the image path

  const newItem = new Item({
    name,
    description,
    image: imagePath // Store the image path in the database
  });

  try {
    await newItem.save(); // Save item to the database
    res.redirect('/');
  } catch (err) {
    console.log(err);
    res.status(500).send('Error saving item');
  }
});

// Route to handle editing an item by ID
app.get('/edit/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const item = await Item.findById(id);
    if (!item) {
      return res.status(404).send('Item not found');
    }
    res.render('edit', { item });
  } catch (err) {
    console.log(err);
    res.status(500).send('Error fetching item');
  }
});

// Handle item update (including image update)
app.post('/edit/:id', upload.single('image'), async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  const imagePath = req.file ? '/uploads/' + req.file.filename : undefined;

  const updateData = {
    name,
    description,
    image: imagePath || undefined // Only update image if a new file is uploaded
  };

  try {
    const updatedItem = await Item.findByIdAndUpdate(id, updateData, { new: true });
    if (!updatedItem) {
      return res.status(404).send('Item not found');
    }
    res.redirect('/');
  } catch (err) {
    console.log(err);
    res.status(500).send('Error updating item');
  }
});

// Delete item (including image deletion)
app.get('/delete/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const item = await Item.findById(id);
    if (!item) {
      return res.status(404).send('Item not found');
    }

    // Delete the image file from the server if it exists
    if (item.image) {
      const filePath = path.join(__dirname, 'public', item.image);
      fs.unlinkSync(filePath); // Remove the image file
    }

    // Delete the item from the database
    await Item.findByIdAndDelete(id);
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error deleting item');
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
