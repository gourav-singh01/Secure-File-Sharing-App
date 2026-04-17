const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cron = require('node-cron');
const nodemailer = require('nodemailer');

const User = require('./models/User');
const File = require('./models/File'); // Optional for storing uploaded file metadata

const app = express();
const PORT = 5000;
const JWT_SECRET = 'filevault_secret';

// ---------------- DB Connection ----------------
mongoose.connect(
  'mongodb+srv://gs4313355:25b0eLmlGPPsgqi9@cluster0.x9jcyud.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0',
  {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }
)
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB error:', err));

// ---------------- Middlewares ----------------
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads folder exists
const uploadPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath);
}

// ---------------- Auth Middleware ----------------
function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
}

// ---------------- Multer Storage ----------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// ---------------- Routes ----------------

// -------- Signup --------
app.post('/signup', async (req, res) => {
  const { email, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) return res.status(400).json({ message: 'User already exists' });

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ email, password: hashedPassword });
  await user.save();
  res.json({ message: '✅ Signup successful' });
});

// -------- Login --------
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: 'User not found' });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

  const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '2d' });
  res.json({ token });
});

// -------- Upload (Authenticated) --------
app.post('/upload', upload.single('file'), async (req, res) => {

  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  const fileUrl = `http://localhost:${PORT}/uploads/${req.file.filename}`;
  res.json({
    fileUrl,
    name: req.file.originalname,
    size: req.file.size,
    type: req.file.mimetype
  });
});

// -------- Send File Link by Email --------
app.post('/send', async (req, res) => {
  const { senderEmail, receiverEmail, fileUrl } = req.body;
  if (!senderEmail || !receiverEmail || !fileUrl)
    return res.status(400).json({ message: 'Missing fields' });

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'gs4313355@gmail.com',
        pass: 'tgtcclagookbgexl'
      }
    });

    const mailOptions = {
      from: senderEmail,
      to: receiverEmail,
      subject: 'File Shared via File Vault',
      html: `<p><strong>${senderEmail}</strong> shared a file with you:</p>
             <a href="${fileUrl}">Download File</a>`
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ message: 'Failed to send email' });
  }
});

// -------- Auto-delete files older than 2 days --------
cron.schedule('0 * * * *', () => {
  const cutoff = Date.now() - 2 * 24 * 60 * 60 * 1000;
  fs.readdir(uploadPath, (err, files) => {
    if (err) return console.error('Read error:', err);
    files.forEach(file => {
      const filePath = path.join(uploadPath, file);
      fs.stat(filePath, (err, stats) => {
        if (!err && stats.birthtimeMs < cutoff) {
          fs.unlink(filePath, err => {
            if (!err) console.log(`🗑️ Deleted: ${file}`);
          });
        }
      });
    });
  });
});

// ---------------- Start Server ----------------
app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
