// server.js – FIXED IMPORT SECTION
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

dotenv.config();



dotenv.config();

console.log('===========================================');
console.log('🚀 SNCOP SERVER STARTING');
console.log('===========================================');
console.log('FRONTEND_URL:', process.env.FRONTEND_URL || '❌ NOT SET');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ SET' : '❌ NOT SET');
console.log('SMTP_HOST:', process.env.SMTP_HOST || '❌ NOT SET');
console.log('SUPABASE_SERVICE_URL:', process.env.SUPABASE_SERVICE_URL || '❌ NOT SET');
console.log('===========================================');

if (!process.env.FRONTEND_URL) {
  console.error('⚠️  WARNING: FRONTEND_URL not set! Password reset will fail!');
}
if (!process.env.JWT_SECRET) {
  console.error('⚠️  WARNING: JWT_SECRET not set! Token generation will fail!');
}


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware - body parsers BEFORE multer, but multer handles multipart
app.use(cors());
app.use(express.urlencoded({ limit: '50gb', extended: true }));
app.use(express.json({ limit: '50gb' }));
app.use(express.raw({ type: 'application/octet-stream', limit: '50gb' }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
  JWT_SECRET,
  FRONTEND_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_SERVICE_URL
} = process.env;

const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY; // Fallback anon key
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY;

if (!JWT_SECRET) {
  console.error("❌ ERROR: Missing JWT_SECRET in .env");
}

const mailer = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: Number(SMTP_PORT) === 465,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});


// Request timeout middleware
app.use((req, res, next) => {
  req.setTimeout(0); // No timeout
  res.setTimeout(0);
  next();
});

// Storage directory
const STORAGE_DIR = path.join(__dirname, 'storage');
const METADATA_FILE = path.join(__dirname, 'file-metadata.json');
const PROFILE_PICS_DIR = path.join(__dirname, 'profile-pictures');
// Ensure storage directory exists
try {
  fs.ensureDirSync(STORAGE_DIR);
} catch (error) {
  console.error('Failed to create storage directory:', error);
  process.exit(1);
}

// Ensure profile pictures directory exists
try {
  fs.ensureDirSync(PROFILE_PICS_DIR);
  console.log('✅ Profile pictures directory created/verified:', PROFILE_PICS_DIR);
} catch (error) {
  console.error('❌ Failed to create profile pictures directory:', error);
}

// Load existing metadata from file
let fileMetadata = new Map();
let subjectsMetadata = [];
let fullBackupData = {
  subjects: [],
  notes: [],
  practiceTests: [],
  practicals: [],
  assignments: [],
  lastBackup: null
};

// Function to save metadata to file (moved up to avoid TDZ error)
const saveMetadata = () => {
  try {
    const metadataObj = Object.fromEntries(fileMetadata);
    fs.writeFileSync(METADATA_FILE, JSON.stringify(metadataObj, null, 2));
    
    // Also save full backup data to storage folder
    const FULL_BACKUP_FILE = path.join(STORAGE_DIR, 'sncop-backup.json');
    const backupData = {
      ...fullBackupData,
      lastBackup: new Date().toISOString()
    };
    fs.writeFileSync(FULL_BACKUP_FILE, JSON.stringify(backupData, null, 2));
  } catch (error) {
    console.error('Error saving metadata file:', error);
  }
};

try {
  if (fs.existsSync(METADATA_FILE)) {
    const metadataJson = fs.readFileSync(METADATA_FILE, 'utf8');
    const metadataObj = JSON.parse(metadataJson);
    fileMetadata = new Map(Object.entries(metadataObj));
    console.log(`Loaded ${fileMetadata.size} file metadata entries`);
  }
  
  // Load full backup data
  const FULL_BACKUP_FILE = path.join(STORAGE_DIR, 'sncop-backup.json');
  if (fs.existsSync(FULL_BACKUP_FILE)) {
    const backupJson = fs.readFileSync(FULL_BACKUP_FILE, 'utf8');
    fullBackupData = JSON.parse(backupJson);
    
    // Ensure assignments array exists
    if (!fullBackupData.assignments) {
      fullBackupData.assignments = [];
    }
    
    console.log(`Loaded backup data with ${fullBackupData.subjects.length} subjects, ${fullBackupData.notes.length} notes, ${fullBackupData.practiceTests.length} practice tests, ${fullBackupData.practicals.length} practicals, ${fullBackupData.assignments.length} assignments`);
  }
} catch (error) {
  console.error('Error loading metadata file:', error);
  fileMetadata = new Map();
  fullBackupData = {
    subjects: [],
    notes: [],
    practiceTests: [],
    practicals: [],
    assignments: [],
    lastBackup: null
  };
}

// Populate fileMetadata from fullBackupData if entries are missing
const initialSize = fileMetadata.size;

if (fullBackupData.notes) {
  fullBackupData.notes.forEach(note => {
    const metadataKey = `${note.subject}-notes-${note.unit}-${note.storedFileName}`;
    if (!fileMetadata.has(metadataKey)) {
      fileMetadata.set(metadataKey, {
        title: note.title,
        description: note.description,
        originalFileName: note.fileName
      });
    }
  });
}

if (fullBackupData.practiceTests) {
  fullBackupData.practiceTests.forEach(test => {
    const metadataKey = `${test.subject}-practice-tests--${test.storedFileName}`;
    if (!fileMetadata.has(metadataKey)) {
      fileMetadata.set(metadataKey, {
        title: test.title,
        description: test.description,
        originalFileName: test.fileName
      });
    }
  });
}

if (fullBackupData.practicals) {
  fullBackupData.practicals.forEach(practical => {
    const metadataKey = `${practical.subject}-practicals--${practical.storedFileName}`;
    if (!fileMetadata.has(metadataKey)) {
      fileMetadata.set(metadataKey, {
        title: practical.title,
        description: practical.description,
        originalFileName: practical.fileName
      });
    }
  });
}

if (fullBackupData.assignments) {
  fullBackupData.assignments.forEach(assignment => {
    const metadataKey = `${assignment.subject}-assignments--${assignment.storedFileName}`;
    if (!fileMetadata.has(metadataKey)) {
      fileMetadata.set(metadataKey, {
        title: assignment.title,
        description: assignment.description,
        originalFileName: assignment.fileName
      });
    }
  });
}

// Reconstruct subjects from notes, practiceTests, practicals, and assignments if subjects array is empty
if (fullBackupData.subjects.length === 0) {
  const allSubjects = new Set();
  
  fullBackupData.notes.forEach(note => {
    if (note.subject) allSubjects.add(note.subject);
  });
  
  fullBackupData.practiceTests.forEach(test => {
    if (test.subject) allSubjects.add(test.subject);
  });
  
  fullBackupData.practicals.forEach(practical => {
    if (practical.subject) allSubjects.add(practical.subject);
  });
  
  fullBackupData.assignments.forEach(assignment => {
    if (assignment.subject) allSubjects.add(assignment.subject);
  });
  
  allSubjects.forEach(subject => {
  // Skip system folders
  if (subject.toLowerCase() === 'temp' || subject.toLowerCase() === 'profile-pictures') {
    return;
  }
  
  const units = new Set();
  fullBackupData.notes
    .filter(note => note.subject === subject && note.unit)
    .forEach(note => units.add(note.unit));
  
  fullBackupData.subjects.push({
    id: Date.now().toString() + Math.random().toString(36).slice(2),
    name: subject,
    units: Array.from(units)
  });
});
  
  console.log(`Reconstructed ${fullBackupData.subjects.length} subjects from backup data`);
}

if (fileMetadata.size > initialSize || fullBackupData.subjects.length > 0) {
  saveMetadata();
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      let subject = req.headers['x-subject'] || '';
      subject = String(subject).trim();

      let type = req.headers['x-type'] || '';
      type = String(type).trim();

      let unit = req.headers['x-unit'] || '';
      unit = String(unit).trim();

      console.log('Early destination params:', { subject, type, unit });

      if (!subject || !type) {
        const tempPath = path.join(STORAGE_DIR, 'temp');
        fs.ensureDirSync(tempPath);
        console.log('Using temp directory, will move file after parsing body');
        return cb(null, tempPath);
      }

      if (!type) {
        return cb(new Error('Type is required'));
      }

      let uploadPath;

      if (type === 'notes' && unit) {
        uploadPath = path.join(STORAGE_DIR, subject, 'notes', unit);
      } else if (type === 'practice-tests') {
        uploadPath = path.join(STORAGE_DIR, subject, 'practice-tests');
      } else if (type === 'practicals') {
        uploadPath = path.join(STORAGE_DIR, subject, 'practicals');
      } else if (type === 'assignments') {
        uploadPath = path.join(STORAGE_DIR, subject, 'assignments');
      } else {
        return cb(new Error(`Invalid type: ${type}${type === 'notes' && !unit ? ' (unit required for notes)' : ''}`));
      }

      fs.ensureDirSync(uploadPath);
      console.log(`Created/verified directory: ${uploadPath}`);
      cb(null, uploadPath);
    } catch (error) {
      console.error('Error in multer destination:', error);
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    try {
      const timestamp = Date.now();
      const ext = path.extname(file.originalname);
      const name = path.basename(file.originalname, ext);
      const sanitizedName = name.replace(/[^a-zA-Z0-9\-_]/g, '_');
      const filename = `${sanitizedName}_${timestamp}${ext}`;
      console.log(`Generated filename: ${filename}`);
      cb(null, filename);
    } catch (error) {
      console.error('Error in multer filename:', error);
      cb(error);
    }
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    try {
      const allowedTypes = /pdf|jpeg|jpg|png|gif/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      
      if (mimetype && extname) {
        console.log(`File accepted: ${file.originalname} (${file.mimetype})`);
        return cb(null, true);
      } else {
        console.log(`File rejected: ${file.originalname} (${file.mimetype})`);
        cb(new Error('Only PDF and image files are allowed!'));
      }
    } catch (error) {
      console.error('Error in multer fileFilter:', error);
      cb(error);
    }
  }
});

// Configure multer for profile picture uploads
const profilePictureStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, PROFILE_PICS_DIR);
  },
  filename: (req, file, cb) => {
    const userId = req.body.userId || 'unknown';
    const ext = path.extname(file.originalname);
    const filename = `profile_${userId}_${Date.now()}${ext}`;
    cb(null, filename);
  }
});

const uploadProfilePicture = multer({
  storage: profilePictureStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed!'));
    }
  }
});

// Utility function to format file size
const formatFileSize = (bytes) => {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

// Create subject directory structure
const createSubjectStructure = (subjectName, units = []) => {
  const subjectPath = path.join(STORAGE_DIR, subjectName);
  
  fs.ensureDirSync(subjectPath);
  
  const notesPath = path.join(subjectPath, 'notes');
  fs.ensureDirSync(notesPath);
  
  units.forEach(unit => {
    const unitPath = path.join(notesPath, unit);
    fs.ensureDirSync(unitPath);
  });
  
  fs.ensureDirSync(path.join(subjectPath, 'practice-tests'));
  fs.ensureDirSync(path.join(subjectPath, 'practicals'));
  fs.ensureDirSync(path.join(subjectPath, 'assignments'));

  return subjectPath;
};

// API Routes

app.post('/api/subjects', (req, res) => {
  try {
    const { name, units } = req.body;
    const subjectPath = createSubjectStructure(name, units);
    
    const existingSubjectIndex = fullBackupData.subjects.findIndex(s => s.name === name);
    const subjectData = {
      id: Date.now().toString(),
      name: name,
      units: units || []
    };
    
    if (existingSubjectIndex >= 0) {
      fullBackupData.subjects[existingSubjectIndex] = subjectData;
    } else {
      fullBackupData.subjects.push(subjectData);
    }
    
    saveMetadata();
    
    res.json({
      success: true,
      message: 'Subject directory structure created successfully',
      path: subjectPath
    });
  } catch (error) {
    console.error('Error creating subject structure:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create subject structure',
      error: error.message
    });
  }
});

app.post('/api/subjects/:subjectName/units', (req, res) => {
  try {
    const { subjectName } = req.params;
    const { unitName } = req.body;
    
    const unitPath = path.join(STORAGE_DIR, subjectName, 'notes', unitName);
    fs.ensureDirSync(unitPath);
    
    const subjectIndex = fullBackupData.subjects.findIndex(s => s.name === subjectName);
    if (subjectIndex >= 0) {
      if (!fullBackupData.subjects[subjectIndex].units.includes(unitName)) {
        fullBackupData.subjects[subjectIndex].units.push(unitName);
        saveMetadata();
      }
    }
    
    res.json({
      success: true,
      message: 'Unit directory created successfully',
      path: unitPath
    });
  } catch (error) {
    console.error('Error creating unit directory:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create unit directory',
      error: error.message
    });
  }
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    console.log('Upload request received:', {
      body: req.body,
      headers: {
        'x-subject': req.headers['x-subject'],
        'x-type': req.headers['x-type'],
        'x-unit': req.headers['x-unit']
      },
      file: req.file ? {
        originalname: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
        path: req.file.path
      } : null
    });

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { title, subject, type, unit, description } = req.body;
    
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }
    
    if (!subject || !subject.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Subject is required'
      });
    }
    
    if (!type || !type.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Type is required'
      });
    }

    if (type === 'notes' && (!unit || !unit.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Unit is required for notes'
      });
    }

    if (req.file.path.includes('temp')) {
      let correctPath;
      if (type === 'notes' && unit) {
        correctPath = path.join(STORAGE_DIR, subject.trim(), 'notes', unit.trim());
      } else if (type === 'practice-tests') {
        correctPath = path.join(STORAGE_DIR, subject.trim(), 'practice-tests');
      } else if (type === 'practicals') {
        correctPath = path.join(STORAGE_DIR, subject.trim(), 'practicals');
      } else if (type === 'assignments') {
        correctPath = path.join(STORAGE_DIR, subject.trim(), 'assignments');
      }
      
      if (correctPath) {
        fs.ensureDirSync(correctPath);
        const newPath = path.join(correctPath, req.file.filename);
        fs.moveSync(req.file.path, newPath);
        req.file.path = newPath;
        console.log(`Moved file from temp to: ${newPath}`);
      }
    }
    
    const fileInfo = {
      id: Date.now().toString(),
      title: title.trim(),
      description: (description || '').trim(),
      fileName: req.file.originalname,
      storedFileName: req.file.filename,
      fileSize: formatFileSize(req.file.size),
      uploadDate: new Date().toLocaleDateString(),
      subject: subject.trim(),
      unit: (unit || '').trim(),
      type: type.trim(),
      filePath: req.file.path,
      fileType: path.extname(req.file.originalname).toLowerCase().includes('pdf') ? 'pdf' : 'image'
    };
    
    const metadataKey = `${subject.trim()}-${type.trim()}-${(unit || '').trim()}-${req.file.filename}`;
    fileMetadata.set(metadataKey, {
      title: title.trim(),
      description: (description || '').trim(),
      originalFileName: req.file.originalname
    });
    
    const backupFileData = {
      id: fileInfo.id,
      title: title.trim(),
      description: (description || '').trim(),
      fileName: req.file.originalname,
      storedFileName: req.file.filename,
      fileSize: fileInfo.fileSize,
      uploadDate: fileInfo.uploadDate,
      subject: subject.trim(),
      type: fileInfo.fileType,
      filePath: req.file.path
    };
    
    if (type.trim() === 'notes') {
      backupFileData.unit = (unit || '').trim();
      fullBackupData.notes = fullBackupData.notes.filter(note => 
        !(note.storedFileName === req.file.filename && note.subject === subject.trim() && note.unit === (unit || '').trim())
      );
      fullBackupData.notes.push(backupFileData);
    } else if (type.trim() === 'practice-tests') {
      fullBackupData.practiceTests = fullBackupData.practiceTests.filter(test => 
        !(test.storedFileName === req.file.filename && test.subject === subject.trim())
      );
      fullBackupData.practiceTests.push(backupFileData);
    } else if (type.trim() === 'practicals') {
      fullBackupData.practicals = fullBackupData.practicals.filter(practical => 
        !(practical.storedFileName === req.file.filename && practical.subject === subject.trim())
      );
      fullBackupData.practicals.push(backupFileData);
    } else if (type.trim() === 'assignments') {
      fullBackupData.assignments = fullBackupData.assignments || [];
      fullBackupData.assignments = fullBackupData.assignments.filter(assignment =>
        !(assignment.storedFileName === req.file.filename && assignment.subject === subject.trim())
      );
      fullBackupData.assignments.push(backupFileData);
    }
    
    const subjectExists = fullBackupData.subjects.some(s => s.name === subject.trim());
    if (!subjectExists) {
      const units = type === 'notes' && unit ? [unit.trim()] : [];
      fullBackupData.subjects.push({
        id: Date.now().toString(),
        name: subject.trim(),
        units
      });
    } else if (type === 'notes' && unit) {
      const subjectIndex = fullBackupData.subjects.findIndex(s => s.name === subject.trim());
      if (!fullBackupData.subjects[subjectIndex].units.includes(unit.trim())) {
        fullBackupData.subjects[subjectIndex].units.push(unit.trim());
      }
    }
    
    saveMetadata();
    
    console.log('File uploaded successfully:', fileInfo);
    
    res.json({
      success: true,
      message: 'File uploaded successfully',
      file: fileInfo
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to upload file',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.get('/api/files/:subject/:type/:unit?/:filename', (req, res) => {
  try {
    const { subject, type, unit, filename } = req.params;
    
    let filePath;
    if (type === 'notes' && unit) {
      filePath = path.join(STORAGE_DIR, subject, 'notes', unit, filename);
    } else if (type === 'practice-tests') {
      filePath = path.join(STORAGE_DIR, subject, 'practice-tests', filename);
    } else if (type === 'practicals') {
      filePath = path.join(STORAGE_DIR, subject, 'practicals', filename);
    } else if (type === 'assignments') {
      filePath = path.join(STORAGE_DIR, subject, 'assignments', filename);
    } else {
      filePath = path.join(STORAGE_DIR, subject, type, filename);
    }
    
    console.log('Attempting to serve file:', {
      subject,
      type,
      unit,
      filename,
      filePath,
      exists: fs.existsSync(filePath)
    });
    
    if (!fs.existsSync(filePath)) {
      const alternativePaths = [];
      
      if (type === 'notes' && unit) {
        alternativePaths.push(
          path.join(STORAGE_DIR, subject, 'notes', unit.replace(/\s+/g, '_'), filename),
          path.join(STORAGE_DIR, subject, 'notes', unit.replace(/\s+/g, '-'), filename),
          path.join(STORAGE_DIR, subject, 'notes', unit.toLowerCase(), filename)
        );
      } else if (type === 'practice-tests') {
        alternativePaths.push(
          path.join(STORAGE_DIR, subject.replace(/\s+/g, '_'), 'practice-tests', filename),
          path.join(STORAGE_DIR, subject.replace(/\s+/g, '-'), 'practice-tests', filename),
          path.join(STORAGE_DIR, subject.toLowerCase(), 'practice-tests', filename)
        );
      } else if (type === 'practicals') {
        alternativePaths.push(
          path.join(STORAGE_DIR, subject.replace(/\s+/g, '_'), 'practicals', filename),
          path.join(STORAGE_DIR, subject.replace(/\s+/g, '-'), 'practicals', filename),
          path.join(STORAGE_DIR, subject.toLowerCase(), 'practicals', filename)
        );
      } else if (type === 'assignments') {
        alternativePaths.push(
          path.join(STORAGE_DIR, subject.replace(/\s+/g, '_'), 'assignments', filename),
          path.join(STORAGE_DIR, subject.replace(/\s+/g, '-'), 'assignments', filename),
          path.join(STORAGE_DIR, subject.toLowerCase(), 'assignments', filename)
        );
      }
      
      if (type !== 'practice-tests' && type !== 'practicals' && type !== 'assignments') {
        alternativePaths.push(
          path.join(STORAGE_DIR, subject.replace(/\s+/g, '_'), type, filename),
          path.join(STORAGE_DIR, subject.replace(/\s+/g, '-'), type, filename)
        );
      }
      
      let foundPath = null;
      for (const altPath of alternativePaths) {
        if (fs.existsSync(altPath)) {
          foundPath = altPath;
          filePath = altPath;
          break;
        }
      }
      
      if (!foundPath) {
        console.error('File not found at path:', filePath);
        console.error('Also tried alternative paths:', alternativePaths);
        return res.status(404).json({
          success: false,
          message: 'File not found'
        });
      }
    }
    
    const ext = path.extname(filename).toLowerCase();
    if (ext === '.pdf') {
      res.setHeader('Content-Type', 'application/pdf');
    } else if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
      res.setHeader('Content-Type', `image/${ext.slice(1)}`);
    } else {
      res.setHeader('Content-Type', 'application/octet-stream');
    }
    
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        res.status(500).json({
          success: false,
          message: 'Failed to send file',
          error: err.message
        });
      }
    });
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to serve file',
      error: error.message
    });
  }
});

app.delete('/api/files/:subject/:type/:unit?/:filename', (req, res) => {
  try {
    const { subject, type, unit, filename } = req.params;
    
    let filePath;
    if (type === 'notes' && unit) {
      filePath = path.join(STORAGE_DIR, subject, 'notes', unit, filename);
    } else if (type === 'practice-tests') {
      filePath = path.join(STORAGE_DIR, subject, 'practice-tests', filename);
    } else if (type === 'practicals') {
      filePath = path.join(STORAGE_DIR, subject, 'practicals', filename);
    } else if (type === 'assignments') {
      filePath = path.join(STORAGE_DIR, subject, 'assignments', filename);
    } else {
      filePath = path.join(STORAGE_DIR, subject, type, filename);
    }
    
    if (fs.existsSync(filePath)) {
      try {
        fs.removeSync(filePath);
        
        const metadataKey = `${subject}-${type}-${unit || ''}-${filename}`;
        fileMetadata.delete(metadataKey);
        
        if (type === 'notes') {
          fullBackupData.notes = fullBackupData.notes.filter(note => 
            !(note.storedFileName === filename && note.subject === subject && note.unit === (unit || ''))
          );
        } else if (type === 'practice-tests') {
          fullBackupData.practiceTests = fullBackupData.practiceTests.filter(test => 
            !(test.storedFileName === filename && test.subject === subject)
          );
        } else if (type === 'practicals') {
          fullBackupData.practicals = fullBackupData.practicals.filter(practical => 
            !(practical.storedFileName === filename && practical.subject === subject)
          );
        } else if (type === 'assignments') {
          fullBackupData.assignments = fullBackupData.assignments.filter(assignment => 
            !(assignment.storedFileName === filename && assignment.subject === subject)
          );
        }
        
        saveMetadata();
        
        res.json({
          success: true,
          message: 'File deleted successfully'
        });
      } catch (deleteError) {
        console.error('Error deleting file:', deleteError);
        res.status(500).json({
          success: false,
          message: 'Failed to delete file',
          error: deleteError.message
        });
      }
    } else {
      const alternativePaths = [];
      
      if (type === 'notes' && unit) {
        alternativePaths.push(
          path.join(STORAGE_DIR, subject, 'notes', unit.replace(/\s+/g, '_'), filename),
          path.join(STORAGE_DIR, subject, 'notes', unit.replace(/\s+/g, '-'), filename),
          path.join(STORAGE_DIR, subject, 'notes', unit.toLowerCase(), filename)
        );
      }
      
      alternativePaths.push(
        path.join(STORAGE_DIR, subject.replace(/\s+/g, '_'), type, filename),
        path.join(STORAGE_DIR, subject.replace(/\s+/g, '-'), type, filename)
      );
      
      let deletedPath = null;
      for (const altPath of alternativePaths) {
        if (fs.existsSync(altPath)) {
          try {
            fs.removeSync(altPath);
            deletedPath = altPath;
            
            const metadataKey = `${subject}-${type}-${unit || ''}-${filename}`;
            fileMetadata.delete(metadataKey);
            
            if (type === 'notes') {
              fullBackupData.notes = fullBackupData.notes.filter(note => 
                !(note.storedFileName === filename && note.subject === subject && note.unit === (unit || ''))
              );
            } else if (type === 'practice-tests') {
              fullBackupData.practiceTests = fullBackupData.practiceTests.filter(test => 
                !(test.storedFileName === filename && test.subject === subject)
              );
            } else if (type === 'practicals') {
              fullBackupData.practicals = fullBackupData.practicals.filter(practical => 
                !(practical.storedFileName === filename && practical.subject === subject)
              );
            } else if (type === 'assignments') {
              fullBackupData.assignments = fullBackupData.assignments.filter(assignment => 
                !(assignment.storedFileName === filename && assignment.subject === subject)
              );
            }
            
            saveMetadata();
            
            console.log('File deleted from alternative path:', altPath);
            break;
          } catch (deleteError) {
            console.error('Error deleting file from alternative path:', altPath, deleteError);
          }
        }
      }
      
      if (deletedPath) {
        res.json({
          success: true,
          message: 'File deleted successfully'
        });
      } else {
        console.error('File not found for deletion:', filePath);
        console.error('Also tried alternative paths:', alternativePaths);
        res.status(404).json({
          success: false,
          message: 'File not found'
        });
      }
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete file',
      error: error.message
    });
  }
});

app.get('/api/files/:subject/:type/:unit?', (req, res) => {
  try {
    const { subject, type, unit } = req.params;
    
    let dirPath;
    if (type === 'notes' && unit) {
      dirPath = path.join(STORAGE_DIR, subject, 'notes', unit);
    } else {
      dirPath = path.join(STORAGE_DIR, subject, type);
    }
    
    if (!fs.existsSync(dirPath)) {
      return res.json({
        success: true,
        files: []
      });
    }
    
    const files = fs.readdirSync(dirPath).map(filename => {
      const filePath = path.join(dirPath, filename);
      const stats = fs.statSync(filePath);
      
      return {
        filename,
        size: formatFileSize(stats.size),
        modified: stats.mtime.toLocaleDateString(),
        type: path.extname(filename).toLowerCase().includes('pdf') ? 'pdf' : 'image'
      };
    });
    
    res.json({
      success: true,
      files
    });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list files',
      error: error.message
    });
  }
});

app.post('/api/verify-files', (req, res) => {
  try {
    const { files } = req.body;
    
    if (!Array.isArray(files)) {
      return res.status(400).json({
        success: false,
        message: 'Files array is required'
      });
    }
    
    const verifiedFiles = [];
    
    files.forEach(file => {
      try {
        let filePath;
        
        if (file.type === 'notes' && file.unit) {
          filePath = path.join(STORAGE_DIR, file.subject, 'notes', file.unit, file.storedFileName);
        } else if (file.type === 'practice-tests') {
          filePath = path.join(STORAGE_DIR, file.subject, 'practice-tests', file.storedFileName);
        } else if (file.type === 'practicals') {
          filePath = path.join(STORAGE_DIR, file.subject, 'practicals', file.storedFileName);
        } else if (file.type === 'assignments') {
          filePath = path.join(STORAGE_DIR, file.subject, 'assignments', file.storedFileName);
        }
        
        if (filePath && fs.existsSync(filePath)) {
          verifiedFiles.push({
            id: file.id,
            exists: true,
            filePath: filePath
          });
        } else {
          console.log(`File not found on server: ${filePath}`);
          verifiedFiles.push({
            id: file.id,
            exists: false,
            filePath: filePath || 'unknown'
          });
        }
      } catch (error) {
        console.error(`Error verifying file ${file.id}:`, error);
        verifiedFiles.push({
          id: file.id,
          exists: false,
          error: error.message
        });
      }
    });
    
    res.json({
      success: true,
      verifiedFiles
    });
  } catch (error) {
    console.error('Error verifying files:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify files',
      error: error.message
    });
  }
});

/* ============================
   LOGIN (robust admin check + token exchange)
   - Uses SUPABASE_SERVICE_URL and SUPABASE_SERVICE_ROLE_KEY to fetch users reliably
   - Returns both access_token and refresh_token for frontend setSession
============================ */
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.json({ success: false, message: "Email and password required" });
    }

    // 1) Fetch ALL users using admin endpoint
    const usersResp = await fetch(`${SUPABASE_SERVICE_URL}/auth/v1/admin/users`, {
      method: "GET",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    const usersJson = await usersResp.json();
    const users = Array.isArray(usersJson) ? usersJson : usersJson.users || [];

    const foundUser = users.find(
      u => String(u.email).toLowerCase() === String(email).toLowerCase()
    );

    console.log("FOUND USER RAW:", foundUser);

    if (!foundUser) {
      return res.json({ success: false, message: "Invalid email or password" });
    }

    // 2) ENFORCE VERIFICATION — FINAL FIX
const isVerified =
  (typeof foundUser.email_confirmed_at === "string" &&
    foundUser.email_confirmed_at.trim() !== "") &&
  foundUser.user_metadata?.email_verified === true;

    if (!isVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before logging in."
      });
    }

    // 3) PASSWORD → TOKEN EXCHANGE (ALLOWED ONLY IF VERIFIED)
    const tokenApiKey = SUPABASE_ANON_KEY;

    const loginResp = await fetch(
      `${SUPABASE_SERVICE_URL}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          apikey: tokenApiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      }
    );

    const loginData = await loginResp.json();

    if (!loginResp.ok) {
      return res.json({
        success: false,
        message: loginData?.error_description || loginData?.error || "Login failed"
      });
    }

    return res.json({
      success: true,
      user: foundUser,
      access_token: loginData.access_token,
      refresh_token: loginData.refresh_token
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.json({ success: false, message: "Server error" });
  }
});


/* ============================
   REGISTER
============================ */
app.post("/api/register", async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    if (!email || !password) {
      return res.json({ success: false, message: "Email and password required" });
    }

    // 1) Create user using PUBLIC SIGNUP ENDPOINT
    const signupResp = await fetch(`${SUPABASE_SERVICE_URL}/auth/v1/signup`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        password,
        data: {
          full_name: fullName,
          email_verified: false
        }
      })
    });

    const signupData = await signupResp.json();

    if (!signupResp.ok || !signupData.user) {
      return res.json({
        success: false,
        message: signupData.error_description || "Registration failed"
      });
    }

    const userId = signupData.user.id;

    // 2) FORCE UNVERIFY
    await fetch(`${SUPABASE_SERVICE_URL}/auth/v1/admin/users/${userId}`, {
      method: "PUT",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email_confirmed_at: null,
        user_metadata: { email_verified: false }
      })
    });

    // 3) CREATE PROFILE
    await fetch(`${SUPABASE_SERVICE_URL}/rest/v1/profiles`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify({
        id: userId,
        full_name: fullName,
        email: email
      })
    });

    // 4) SEND VERIFY EMAIL
    const token = jwt.sign({ email, type: "verify" }, JWT_SECRET, { expiresIn: "7d" });

    await mailer.sendMail({
      from: SMTP_FROM,
      to: email,
      subject: "Verify Your Email",
      html: `
        <h2>Hello ${fullName}!</h2>
        <p>Please verify your email by clicking the link below:</p>
        <a href="${FRONTEND_URL}/verify-account?token=${token}">Verify Email Here</a>
      `
    });

    return res.json({
      success: true,
      message: "Account created. Verify your email to continue."
    });

  } catch (err) {
    console.error("REGISTER ERROR:", err);
    return res.json({ success: false, message: "Server error" });
  }
});

/* ============================
   VERIFY ACCOUNT
============================ */
app.post("/api/verify-account", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) return res.json({ success: false, message: "Missing token" });

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.json({ success: false, message: "Invalid or expired token" });
    }

    const email = decoded.email.toLowerCase();

    // FETCH USER
    const userResp = await fetch(`${SUPABASE_SERVICE_URL}/auth/v1/admin/users`, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    const json = await userResp.json();
    const users = Array.isArray(json) ? json : json.users;
    const user = users.find(u => u.email.toLowerCase() === email);

    if (!user) return res.json({ success: false, message: "User not found" });

    // UPDATE VERIFIED FIELDS
    const now = new Date().toISOString();

    await fetch(`${SUPABASE_SERVICE_URL}/auth/v1/admin/users/${user.id}`, {
      method: "PUT",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email_confirmed_at: now,
        confirmed_at: now,
        user_metadata: { email_verified: true }
      })
    });

    return res.json({ success: true, message: "Email verified successfully." });

  } catch (err) {
    console.error("VERIFY ERROR:", err);
    return res.json({ success: false, message: "Server error" });
  }
});



app.get('/api/storage-sync/:subject?', (req, res) => {
  try {
    const { subject } = req.params;
    let storageStructure = {};
    
    if (subject) {
      const subjectPath = path.join(STORAGE_DIR, subject);
      if (fs.existsSync(subjectPath)) {
        storageStructure[subject] = getSubjectFiles(subjectPath, subject);
      }
    } else {
      if (fs.existsSync(STORAGE_DIR)) {
        const subjects = fs.readdirSync(STORAGE_DIR).filter(item => {
          const itemPath = path.join(STORAGE_DIR, item);
          // Filter out temp AND profile-pictures folders
          return fs.statSync(itemPath).isDirectory() && 
                 item.toLowerCase() !== 'temp' && 
                 item.toLowerCase() !== 'profile-pictures';
        });
        
        subjects.forEach(subjectName => {
          const subjectPath = path.join(STORAGE_DIR, subjectName);
          storageStructure[subjectName] = getSubjectFiles(subjectPath, subjectName);
        });
      }
    } // ✅ MOVED THE CLOSING BRACE HERE
    
    if (Object.keys(storageStructure).length === 0 && fullBackupData.subjects.length > 0) {
      console.log('Storage structure empty, using backup data');
      
      fullBackupData.subjects.forEach(subjectData => {
        // Skip temp subjects from backup data too
        if (subjectData.name.toLowerCase() === 'temp') return;
        
        storageStructure[subjectData.name] = {
          notes: {},
          'practice-tests': [],
          practicals: [],
          assignments: []
        };
        
        const subjectNotes = fullBackupData.notes.filter(note => note.subject === subjectData.name);
        subjectNotes.forEach(note => {
          if (!storageStructure[subjectData.name].notes[note.unit]) {
            storageStructure[subjectData.name].notes[note.unit] = [];
          }
          storageStructure[subjectData.name].notes[note.unit].push({
            filename: note.storedFileName,
            title: note.title,
            description: note.description,
            size: note.fileSize,
            modified: note.uploadDate,
            type: note.type,
            subject: note.subject,
            unit: note.unit
          });
        });
        
        const subjectTests = fullBackupData.practiceTests.filter(test => test.subject === subjectData.name);
        storageStructure[subjectData.name]['practice-tests'] = subjectTests.map(test => ({
          filename: test.storedFileName,
          title: test.title,
          description: test.description,
          size: test.fileSize,
          modified: test.uploadDate,
          type: test.type,
          subject: test.subject
        }));
        
        const subjectPracticals = fullBackupData.practicals.filter(practical => practical.subject === subjectData.name);
        storageStructure[subjectData.name].practicals = subjectPracticals.map(practical => ({
          filename: practical.storedFileName,
          title: practical.title,
          description: practical.description,
          size: practical.fileSize,
          modified: practical.uploadDate,
          type: practical.type,
          subject: practical.subject
        }));
        
        const subjectAssignments = fullBackupData.assignments.filter(assignment => assignment.subject === subjectData.name);
        storageStructure[subjectData.name].assignments = subjectAssignments.map(assignment => ({
          filename: assignment.storedFileName,
          title: assignment.title,
          description: assignment.description,
          size: assignment.fileSize,
          modified: assignment.uploadDate,
          type: assignment.type,
          subject: assignment.subject
        }));
      });
    }
    
    res.json({
      success: true,
      storageStructure,
      backupData: fullBackupData
    });
  } catch (error) {
    console.error('Error getting storage structure:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get storage structure',
      error: error.message
    });
  }
});

function getSubjectFiles(subjectPath, subjectName) {
  const subjectData = {
    notes: {},
    'practice-tests': [],
    practicals: [],
    assignments: []
  };
  
  try {
    const notesPath = path.join(subjectPath, 'notes');
    if (fs.existsSync(notesPath)) {
      const units = fs.readdirSync(notesPath).filter(item => {
        const itemPath = path.join(notesPath, item);
        return fs.statSync(itemPath).isDirectory();
      });
      
      units.forEach(unit => {
        const unitPath = path.join(notesPath, unit);
        const files = fs.readdirSync(unitPath).filter(file => {
          const filePath = path.join(unitPath, file);
          return fs.statSync(filePath).isFile();
        });
        
        subjectData.notes[unit] = files.map(filename => {
          const filePath = path.join(unitPath, filename);
          const stats = fs.statSync(filePath);
          
          const metadataKey = `${subjectName}-notes-${unit}-${filename}`;
          const metadata = fileMetadata.get(metadataKey);
          
          let baseTitle = filename.replace(/\.[^/.]+$/, "");
          baseTitle = baseTitle.replace(/_\d{13}$/, "");
          baseTitle = baseTitle.replace(/_/g, " ");
          baseTitle = baseTitle.replace(/\b\w/g, l => l.toUpperCase());
          
          const finalTitle = metadata?.title || baseTitle;
          const description = metadata?.description || '';
          
          return {
            filename,
            title: finalTitle,
            description: description,
            size: formatFileSize(stats.size),
            modified: stats.mtime.toLocaleDateString(),
            type: path.extname(filename).toLowerCase().includes('pdf') ? 'pdf' : 'image',
            subject: subjectName,
            unit: unit
          };
        });
      });
    }
    
    const assignmentsPath = path.join(subjectPath, 'assignments');
    if (fs.existsSync(assignmentsPath)) {
      const files = fs.readdirSync(assignmentsPath)
        .filter(file => fs.statSync(path.join(assignmentsPath, file)).isFile());

      subjectData.assignments = files.map(filename => {
        const filePath = path.join(assignmentsPath, filename);
        const stats = fs.statSync(filePath);

        const metadataKey = `${subjectName}-assignments--${filename}`;
        const metadata = fileMetadata.get(metadataKey);

        let baseTitle = filename.replace(/\.[^/.]+$/, "");
        baseTitle = baseTitle.replace(/_\d{13}$/, "");
        baseTitle = baseTitle.replace(/_/g, " ");
        baseTitle = baseTitle.replace(/\b\w/g, l => l.toUpperCase());

        return {
          filename,
          title: metadata?.title || baseTitle,
          description: metadata?.description || '',
          size: formatFileSize(stats.size),
          modified: stats.mtime.toLocaleDateString(),
          type: path.extname(filename).toLowerCase().includes('pdf') ? 'pdf' : 'image',
          subject: subjectName
        };
      });
    }
    
    const practiceTestsPath = path.join(subjectPath, 'practice-tests');
    if (fs.existsSync(practiceTestsPath)) {
      const files = fs.readdirSync(practiceTestsPath).filter(file => {
        const filePath = path.join(practiceTestsPath, file);
        return fs.statSync(filePath).isFile();
      });
      
      subjectData['practice-tests'] = files.map(filename => {
        const filePath = path.join(practiceTestsPath, filename);
        const stats = fs.statSync(filePath);
        
        const metadataKey = `${subjectName}-practice-tests--${filename}`;
        const metadata = fileMetadata.get(metadataKey);
        
        let baseTitle = filename.replace(/\.[^/.]+$/, "");
        baseTitle = baseTitle.replace(/_\d{13}$/, "");
        baseTitle = baseTitle.replace(/_/g, " ");
        baseTitle = baseTitle.replace(/\b\w/g, l => l.toUpperCase());
        const finalTitle = metadata?.title && metadata.title.trim() !== '' ? metadata.title : baseTitle;
        const description = metadata?.description || '';
        
        return {
          filename,
          title: finalTitle,
          description: description,
          size: formatFileSize(stats.size),
          modified: stats.mtime.toLocaleDateString(),
          type: path.extname(filename).toLowerCase().includes('pdf') ? 'pdf' : 'image',
          subject: subjectName
        };
      });
    }
    
    const practicalsPath = path.join(subjectPath, 'practicals');
    if (fs.existsSync(practicalsPath)) {
      const files = fs.readdirSync(practicalsPath).filter(file => {
        const filePath = path.join(practicalsPath, file);
        return fs.statSync(filePath).isFile();
      });
      
      subjectData.practicals = files.map(filename => {
        const filePath = path.join(practicalsPath, filename);
        const stats = fs.statSync(filePath);
        
        const metadataKey = `${subjectName}-practicals--${filename}`;
        const metadata = fileMetadata.get(metadataKey);
        
        let baseTitle = filename.replace(/\.[^/.]+$/, "");
        baseTitle = baseTitle.replace(/_\d{13}$/, "");
        baseTitle = baseTitle.replace(/_/g, " ");
        baseTitle = baseTitle.replace(/\b\w/g, l => l.toUpperCase());
        
        const finalTitle = metadata?.title && metadata.title.trim() !== '' ? metadata.title : baseTitle;
        const description = metadata?.description || '';
        
        return {
          filename,
          title: finalTitle,
          description: description,
          size: formatFileSize(stats.size),
          modified: stats.mtime.toLocaleDateString(),
          type: path.extname(filename).toLowerCase().includes('pdf') ? 'pdf' : 'image',
          subject: subjectName
        };
      });
    }
  } catch (error) {
    console.error(`Error reading subject files for ${subjectName}:`, error);
  }
  
  return subjectData;
}

app.use('/storage', express.static(STORAGE_DIR));

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    storage: STORAGE_DIR,
    timestamp: new Date().toISOString()
  });
});

app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
});

// Replace the existing GET /verify-account route with this:

app.get("/verify-account", (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Verification Error</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 12px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
              text-align: center;
              max-width: 400px;
            }
            h2 { color: #e53e3e; margin-bottom: 20px; }
            p { color: #4a5568; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>❌ Invalid Verification Link</h2>
            <p>The verification token is missing. Please use the link from your email.</p>
          </div>
        </body>
      </html>
    `);
  }

  // Auto-verify by posting to the API endpoint
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Email Verification</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            text-align: center;
            max-width: 400px;
          }
          .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .success {
            color: #38a169;
            font-size: 60px;
            margin-bottom: 20px;
            display: none;
          }
          .error {
            color: #e53e3e;
            font-size: 60px;
            margin-bottom: 20px;
            display: none;
          }
          .message {
            color: #4a5568;
            line-height: 1.6;
            margin-bottom: 20px;
          }
          .btn {
            display: inline-block;
            padding: 12px 30px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            margin-top: 20px;
            display: none;
          }
          .btn:hover {
            background: #5a67d8;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="spinner" id="spinner"></div>
          <div class="success" id="success">✓</div>
          <div class="error" id="error">✗</div>
          <h2 id="title">Verifying Your Email...</h2>
          <p class="message" id="message">Please wait while we verify your account.</p>
          <a href="${process.env.FRONTEND_URL || '/'}/login" class="btn" id="loginBtn">Go to Login</a>
        </div>

        <script>
          (async () => {
            try {
              const response = await fetch('/api/verify-account', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token: '${token}' })
              });

              const data = await response.json();

              document.getElementById('spinner').style.display = 'none';

              if (data.success) {
                document.getElementById('success').style.display = 'block';
                document.getElementById('title').textContent = 'Email Verified!';
                document.getElementById('message').textContent = data.message || 'Your account has been successfully verified. You can now log in.';
                document.getElementById('loginBtn').style.display = 'inline-block';
              } else {
                document.getElementById('error').style.display = 'block';
                document.getElementById('title').textContent = 'Verification Failed';
                document.getElementById('message').textContent = data.message || 'Unable to verify your email. The link may have expired.';
                document.getElementById('loginBtn').style.display = 'inline-block';
                document.getElementById('loginBtn').textContent = 'Back to Home';
              }
            } catch (err) {
              console.error('Verification error:', err);
              document.getElementById('spinner').style.display = 'none';
              document.getElementById('error').style.display = 'block';
              document.getElementById('title').textContent = 'Verification Error';
              document.getElementById('message').textContent = 'An unexpected error occurred. Please try again later.';
              document.getElementById('loginBtn').style.display = 'inline-block';
              document.getElementById('loginBtn').textContent = 'Back to Home';
            }
          })();
        </script>
      </body>
    </html>
  `);
});


// FINAL FIX: backend should NOT redirect
// It must send a minimal HTML that lets the frontend handle routing.





app.get('/api/assignments', (req, res) => {
  try {
    res.json({
      success: true,
      data: fullBackupData.assignments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assignments'
    });
  }
});

app.delete('/api/subjects/:subjectName', (req, res) => {
  try {
    const { subjectName } = req.params;

    if (!subjectName || subjectName.toLowerCase() === 'temp') {
      return res.status(400).json({
        success: false,
        message: 'Invalid subject name'
      });
    }

    const subjectPath = path.join(STORAGE_DIR, subjectName);
    if (fs.existsSync(subjectPath)) {
      fs.removeSync(subjectPath);
      console.log(`Deleted subject folder: ${subjectPath}`);
    }

    fullBackupData.subjects = fullBackupData.subjects.filter(s => s.name !== subjectName);
    fullBackupData.notes = fullBackupData.notes.filter(n => n.subject !== subjectName);
    fullBackupData.practiceTests = fullBackupData.practiceTests.filter(t => t.subject !== subjectName);
    fullBackupData.practicals = fullBackupData.practicals.filter(p => p.subject !== subjectName);
    fullBackupData.assignments = fullBackupData.assignments.filter(a => a.subject !== subjectName);

    saveMetadata();

    return res.json({
      success: true,
      message: `Subject '${subjectName}' deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting subject:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete subject',
      error: error.message
    });
  }
});

/* ============================
   SEND WELCOME + VERIFY EMAIL
============================ */
app.post("/api/send-welcome", async (req, res) => {
  try {
    const { email, fullName } = req.body;

    const token = jwt.sign(
      { email, type: "verify" },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const verifyLink = `${FRONTEND_URL}/verify-account?token=${token}`;

    await mailer.sendMail({
      from: SMTP_FROM,
      to: email,
      subject: "Welcome to SNCOP-AI — Verify Your Email",
      html: `
        <h2>Welcome ${fullName}!</h2>
        <p>Thank you for registering with SNCOP-AI.</p>
        <p><a href="${verifyLink}" style="font-size:16px;color:blue;">Click here to verify your email</a></p>
      `,
    });

    res.json({ success: true, message: "Welcome & verification email sent." });
  } catch (err) {
    console.log("WELCOME MAIL ERR:", err);
    res.status(500).json({ success: false, message: "Email send failed." });
  }
});

app.post("/send-welcome", (req, res) => {
  req.url = "/api/send-welcome";
  app.handle(req, res);
});

/* ============================
      VERIFY ACCOUNT — FINAL WORKING
============================ */



/* ============================
      FORGOT PASSWORD
============================ */
/* ============================
   FORGOT PASSWORD - FIXED URL
============================ */
app.post("/api/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Create token
    const token = jwt.sign(
      { email, type: "reset" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    // ✅ USE FRONTEND_URL FROM .env INSTEAD OF req.headers.host
    const resetUrl = `${FRONTEND_URL}/reset-password?jwt=${token}`;

    console.log("========================================");
    console.log("PASSWORD RESET LINK GENERATED");
    console.log("Reset URL:", resetUrl);
    console.log("========================================");

    await mailer.sendMail({
      from: SMTP_FROM,
      to: email,
      subject: "SNCOP-AI Password Reset",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Password Reset Request</h2>
          <p>Click the button below to reset your password:</p>
          
          <div style="margin: 30px 0;">
            <a href="${resetUrl}"
               style="background-color: #4F46E5; 
                      color: white; 
                      padding: 12px 30px; 
                      text-decoration: none; 
                      border-radius: 8px; 
                      display: inline-block;
                      font-weight: bold;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">Or copy this link:</p>
          <p style="word-break: break-all; color: #4F46E5; background: #f3f4f6; padding: 10px; border-radius: 5px;">
            ${resetUrl}
          </p>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            This link expires in 1 hour.
          </p>
        </div>
      `,
    });

    return res.json({
      success: true,
      message: "Password reset email sent",
    });

  } catch (err) {
    console.error("FORGOT-PASSWORD ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to send reset email",
    });
  }
});



app.post("/api/force-unverify", async (req, res) => {
  try {
    const { userId } = req.body;

    const updateResp = await fetch(
      `${SUPABASE_SERVICE_URL}/auth/v1/admin/users/${userId}`,
      {
        method: "PUT",
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email_confirmed_at: null, // Force unverified
        }),
      }
    );

    if (!updateResp.ok) {
      const msg = await updateResp.text();
      console.error("FORCE UNVERIFY ERROR:", msg);
      return res.json({ success: false });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("FORCE UNVERIFY ERR:", err);
    return res.json({ success: false });
  }
});


/* ============================
   VERIFY ACCOUNT (VITE FIXED)
============================= */



/* ============================
         RESET PASSWORD
=========================== */

app.post("/reset-password", (req, res, next) => {
  req.url = "/api/reset-password";
  next();
});

app.post("/api/reset-password", async (req, res) => {
  try {
    const { token, password, validateOnly } = req.body;

    if (!token) return res.json({ success: false, message: "Missing token" });

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.json({ success: false, message: "Invalid or expired token" });
    }

    const email = decoded.email;

    console.log("========================================");
    console.log("🔍 RESET PASSWORD DEBUG:");
    console.log("Email from token:", email);
    console.log("Validate only:", validateOnly);
    console.log("========================================");

    if (validateOnly) {
      return res.json({ success: true, email });
    }

    if (!password || password.length < 6) {
      return res.json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // FIND USER - ENHANCED LOGGING
    console.log("🔍 Searching for user with email:", email);
    console.log("Using endpoint:", `${SUPABASE_SERVICE_URL}/auth/v1/admin/users`);
    
    const listResp = await fetch(
      `${SUPABASE_SERVICE_URL}/auth/v1/admin/users`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    const usersData = await listResp.json();
    console.log("📋 Total users found:", Array.isArray(usersData) ? usersData.length : usersData.users?.length || 0);
    
    const users = Array.isArray(usersData) ? usersData : usersData.users || [];
    
    // Log all user emails (for debugging)
    console.log("📧 All user emails:", users.map(u => u.email));
    
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    console.log("✅ User found:", user ? "YES" : "NO");
    if (user) {
      console.log("👤 User ID:", user.id);
      console.log("📧 User Email:", user.email);
    }
    console.log("========================================");

    if (!user) return res.json({ success: false, message: "User not found" });

    // UPDATE PASSWORD
    console.log("🔄 Updating password for user:", user.id);
    
    const updateResp = await fetch(
      `${SUPABASE_SERVICE_URL}/auth/v1/admin/users/${user.id}`,
      {
        method: "PUT",
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      }
    );

    const updateData = await updateResp.json();
    
    if (!updateResp.ok) {
      console.error("❌ Password update failed:", updateData);
      return res.json({ 
        success: false, 
        message: updateData.message || "Failed to update password" 
      });
    }

    console.log("✅ Password updated successfully");
    console.log("========================================");

    return res.json({
      success: true,
      message: "Password updated successfully",
    });

  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);
    return res.status(500).json({ success: false });
  }
});

/* ============================
   UPLOAD PROFILE PICTURE - OPTIMIZED
   Images are pre-compressed on frontend, so no server processing needed
============================ */
app.post('/api/upload-profile-picture', uploadProfilePicture.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { userId } = req.body;

    if (!userId) {
      // Clean up uploaded file
      fs.removeSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    console.log('✅ Profile picture uploaded (pre-compressed by client):', req.file.filename);

    // Delete old profile pictures for this user
    try {
      const files = fs.readdirSync(PROFILE_PICS_DIR);
      files.forEach(file => {
        if (file.startsWith(`profile_${userId}_`) && file !== req.file.filename) {
          const oldFilePath = path.join(PROFILE_PICS_DIR, file);
          fs.removeSync(oldFilePath);
          console.log('🗑️ Deleted old profile picture:', oldFilePath);
        }
      });
    } catch (err) {
      console.error('Error cleaning up old profile pictures:', err);
    }

    // Generate avatar URL
    const avatarUrl = `/api/profile-pictures/${req.file.filename}`;

    // Update user profile in Supabase
    try {
      const updateResp = await fetch(
        `${SUPABASE_SERVICE_URL}/rest/v1/profiles?id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation'
          },
          body: JSON.stringify({
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString()
          })
        }
      );

      if (!updateResp.ok) {
        console.error('Failed to update profile in Supabase');
      }
    } catch (err) {
      console.error('Error updating profile in Supabase:', err);
    }

    console.log('✅ Profile picture uploaded successfully:', req.file.filename);

    res.json({
      success: true,
      message: 'Profile picture uploaded successfully',
      avatarUrl: avatarUrl,
      filename: req.file.filename
    });

  } catch (error) {
    console.error('Error uploading profile picture:', error);
    
    // Clean up file if it was uploaded
    if (req.file && fs.existsSync(req.file.path)) {
      fs.removeSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: 'Failed to upload profile picture',
      error: error.message
    });
  }
});

/* ============================
   SERVE PROFILE PICTURE - WITH CACHING
============================ */
app.get('/api/profile-pictures/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(PROFILE_PICS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Profile picture not found'
      });
    }

    // Set appropriate content type
    const ext = path.extname(filename).toLowerCase();
    const contentTypeMap = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };

    res.setHeader('Content-Type', contentTypeMap[ext] || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.setHeader('ETag', `"${filename}"`); // Add ETag for better caching

    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        res.status(500).json({
          success: false,
          message: 'Failed to serve profile picture',
          error: err.message
        });
      }
    });
  } catch (error) {
    console.error('Error serving profile picture:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to serve profile picture',
      error: error.message
    });
  }
});

/* ============================
   SERVE PROFILE PICTURE - WITH CACHING
============================ */
app.get('/api/profile-pictures/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(PROFILE_PICS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Profile picture not found'
      });
    }

    // Set appropriate content type
    const ext = path.extname(filename).toLowerCase();
    const contentTypeMap = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };

    res.setHeader('Content-Type', contentTypeMap[ext] || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.setHeader('ETag', `"${filename}"`); // Add ETag for better caching

    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        res.status(500).json({
          success: false,
          message: 'Failed to serve profile picture',
          error: err.message
        });
      }
    });
  } catch (error) {
    console.error('Error serving profile picture:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to serve profile picture',
      error: error.message
    });
  }
});

/* ============================
   SERVE PROFILE PICTURE
============================ */
app.get('/api/profile-pictures/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(PROFILE_PICS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Profile picture not found'
      });
    }

    // Set appropriate content type
    const ext = path.extname(filename).toLowerCase();
    const contentTypeMap = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };

    res.setHeader('Content-Type', contentTypeMap[ext] || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving profile picture:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to serve profile picture',
      error: error.message
    });
  }
});

// ================================
// REMOVE PROFILE PICTURE (FULL FIX)
// ================================
app.delete('/api/remove-profile-picture', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }

    // 1️⃣ Get profile from Supabase
    const profileRes = await fetch(
      `${SUPABASE_SERVICE_URL}/rest/v1/profiles?id=eq.${userId}&select=avatar_url`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    const profiles = await profileRes.json();
    const avatarUrl = profiles?.[0]?.avatar_url;

    // 2️⃣ Delete file from main storage
    if (avatarUrl) {
      const fileName = path.basename(avatarUrl); 
      const filePath = path.join(PROFILE_PICS_DIR, fileName);

      if (fs.existsSync(filePath)) {
        fs.removeSync(filePath);
        console.log('🗑️ Deleted profile picture file:', fileName);
      }
    }

    // 3️⃣ Update Supabase profile
    await fetch(`${SUPABASE_SERVICE_URL}/rest/v1/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        avatar_url: null,
        updated_at: new Date().toISOString(),
      }),
    });

    return res.json({
      success: true,
      message: 'Profile picture removed successfully',
    });
  } catch (err) {
    console.error('Remove profile picture error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to remove profile picture',
    });
  }
});


/* ============================
   STATIC FRONTEND - MUST BE LAST
=========================== */

const DIST_PATH = path.join(__dirname, "dist");

console.log("Serving frontend from:", DIST_PATH);

// Check if dist folder exists
if (!fs.existsSync(DIST_PATH)) {
  console.error("⚠️ WARNING: dist folder not found at:", DIST_PATH);
  console.error("Please run 'npm run build' first");
}

// Serve static files with proper MIME types
app.use(express.static(DIST_PATH, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    } else if (filePath.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
  }
}));

// Explicitly serve assets directory
const assetsPath = path.join(DIST_PATH, 'assets');
if (fs.existsSync(assetsPath)) {
  app.use('/assets', express.static(assetsPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      } else if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
      }
    }
  }));
}

// 404 handler for API routes (must be before SPA fallback)
app.use("/api/*", (req, res) => {
  return res.status(404).json({
    success: false,
    message: "API route not found",
    path: req.originalUrl,
  });
});

// SPA fallback - MUST BE LAST
app.get('*', (req, res) => {
  const indexPath = path.join(DIST_PATH, "index.html");
  
  if (!fs.existsSync(indexPath)) {
    return res.status(500).send('Application not built. Please run: npm run build');
  }
  
  res.sendFile(indexPath);
});


const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 File storage server running on port ${PORT}`);
  console.log(`📁 Storage directory: ${STORAGE_DIR}`);
  console.log(`🌐 Server accessible at http://localhost:${PORT}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please use a different port or stop the existing process.`);
  } else {
    console.error('❌ Server error:', error);
  }
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
