const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

const DATA_FILE = path.join(__dirname, 'students.json');

// For parsing JSON and urlencoded form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (CSS, JS, HTML)
app.use(express.static(__dirname));

// Storage for Excel uploads (in memory)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Load students data from JSON file on server start
let studentsData = [];
if (fs.existsSync(DATA_FILE)) {
  try {
    const rawData = fs.readFileSync(DATA_FILE, 'utf8');
    studentsData = JSON.parse(rawData);
    console.log(`Loaded ${studentsData.length} student records from JSON file.`);
  } catch (err) {
    console.error('Error reading students.json:', err);
  }
} else {
  console.log('No existing students.json file, starting with empty data.');
}

// Admin credentials
const adminUser = 'Siddartha';
const adminPass = 'Siddartha Talla';

// Routes

// Serve home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Student login POST
app.post('/student-login', (req, res) => {
  const { roll, password } = req.body;

  // Password must match roll number
  if (!roll || !password || roll !== password) {
    return res.send(`<h2 style="color:red;text-align:center;">Invalid roll number or password. <a href="student_login.html">Try again</a></h2>`);
  }

  // Find student
  const student = studentsData.find(s => s.roll === roll);

  if (!student) {
    return res.send(`<h2 style="color:red;text-align:center;">Roll number not found. <a href="student_login.html">Try again</a></h2>`);
  }

  // Serve student_result.html with query param roll
  res.redirect(`/student_result.html?roll=${roll}`);
});

// API to get student data by roll (used by frontend)
app.get('/api/student/:roll', (req, res) => {
  const roll = req.params.roll;
  const student = studentsData.find(s => s.roll === roll);
  if (!student) {
    return res.status(404).json({ error: 'Student not found' });
  }
  res.json(student);
});

// Admin login POST
app.post('/admin-login', (req, res) => {
  const { username, password } = req.body;

  if (username === adminUser && password === adminPass) {
    res.sendFile(path.join(__dirname, 'admin_upload.html'));
  } else {
    res.send(`<h2 style="color:red;text-align:center;">Invalid admin credentials. <a href="admin_login.html">Try again</a></h2>`);
  }
});

// Admin upload Excel POST
app.post('/upload-excel', upload.single('excelFile'), (req, res) => {
  if (!req.file) {
    return res.send(`<h2 style="color:red;text-align:center;">No file uploaded. <a href="admin_upload.html">Try again</a></h2>`);
  }

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    studentsData = jsonData.map(item => ({
      name: item.name || '',
      roll: item.roll ? item.roll.toString() : '',
      batch: item.batch || '',
      year: item.year || '',
      semester: item.semester || '',
      department: item.department || '',
      mailid: item.mailid || '',
      contact: item.contact ? item.contact.toString() : '',
      attendance: Number(item.attendance) || 0,
      cgpa: Number(item.cgpa) || 0,
      backlogs: Number(item.backlogs) || 0,
      credits: Number(item.credits) || 0
    }));

    // Save to JSON file
    fs.writeFileSync(DATA_FILE, JSON.stringify(studentsData, null, 2), 'utf8');
    console.log(`Saved ${studentsData.length} students to students.json`);

    res.sendFile(path.join(__dirname, 'upload_success.html'));
  } catch (error) {
    console.error(error);
    res.send(`<h2 style="color:red;text-align:center;">Error parsing Excel file. <a href="admin_upload.html">Try again</a></h2>`);
  }
});

// Serve other pages directly (since all files are in same folder)
app.get('/:page', (req, res) => {
  const page = req.params.page;
  const validPages = ['index.html', 'student_login.html', 'admin_login.html', 'student_result.html', 'graph.html', 'admin_upload.html', 'upload_success.html'];
  if (validPages.includes(page)) {
    res.sendFile(path.join(__dirname, page));
  } else {
    res.status(404).send('Page not found');
  }
});

app.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}`);
});
