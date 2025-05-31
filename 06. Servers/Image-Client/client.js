const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const chokidar = require('chokidar');
const crypto = require('crypto');

// Configuration
const sourceFolder = path.join(__dirname, 'images-to-upload');
const serverUrl = process.env.SERVER_URL;
const processedLogFile = path.join(__dirname, 'processed-files.json');

// Create source folder if it doesn't exist
if (!fs.existsSync(sourceFolder)) {
  fs.mkdirSync(sourceFolder, { recursive: true });
  console.log(`Created source folder: ${sourceFolder}`);
}

// Initialize or load processed files log
let processedFiles = {};
let fileHashes = {};
if (fs.existsSync(processedLogFile)) {
  try {
    const data = fs.readFileSync(processedLogFile, 'utf8');
    const savedData = JSON.parse(data);
    processedFiles = savedData.files || {};
    fileHashes = savedData.hashes || {};
    console.log(`Loaded ${Object.keys(processedFiles).length} processed files from log`);
  } catch (err) {
    console.error('Error loading processed files log:', err);
    processedFiles = {};
    fileHashes = {};
  }
}

// Save processed files to log
function saveProcessedFiles() {
  try {
    const dataToSave = {
      files: processedFiles,
      hashes: fileHashes
    };
    fs.writeFileSync(processedLogFile, JSON.stringify(dataToSave, null, 2));
  } catch (err) {
    console.error('Error saving processed files log:', err);
  }
}

// Calculate file hash for duplicate detection
async function calculateFileHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5');
    const stream = fs.createReadStream(filePath);
    
    stream.on('error', err => reject(err));
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

// Clean up tracking for files that no longer exist
async function cleanupProcessedFiles() {
  console.log('Cleaning up processed files log...');
  let removed = 0;
  
  for (const filePath in processedFiles) {
    try {
      await fs.promises.access(filePath, fs.constants.F_OK);
    } catch (err) {
      // File no longer exists
      delete processedFiles[filePath];
      removed++;
    }
  }
  
  // Clean up file hashes that don't have corresponding entries
  const validPaths = new Set(Object.keys(processedFiles));
  for (const hash in fileHashes) {
    fileHashes[hash] = fileHashes[hash].filter(path => validPaths.has(path));
    if (fileHashes[hash].length === 0) {
      delete fileHashes[hash];
    }
  }
  
  if (removed > 0) {
    console.log(`Removed ${removed} entries for files that no longer exist`);
    saveProcessedFiles();
  } else {
    console.log('No stale entries found');
  }
}

// Upload a single file
async function uploadFile(filePath) {
  const filename = path.basename(filePath);
  
  try {
    // Check if file exists and is readable
    await fs.promises.access(filePath, fs.constants.R_OK);
    
    // Calculate file hash for content-based deduplication
    const fileHash = await calculateFileHash(filePath);
    
    // Check if file with same hash was already processed
    if (fileHashes[fileHash]) {
      const duplicatePath = fileHashes[fileHash][0];
      const duplicateFilename = path.basename(duplicatePath);
      console.log(`Skipping ${filename} (duplicate content of ${duplicateFilename})`);
      
      // Track this file as processed, linking to the already processed duplicate
      processedFiles[filePath] = {
        uploadedAt: new Date().toISOString(),
        isDuplicate: true,
        originalFile: duplicatePath,
        serverPath: processedFiles[duplicatePath].serverPath
      };
      
      // Add this path to the hash entry
      fileHashes[fileHash].push(filePath);
      
      saveProcessedFiles();
      return;
    }
    
    // Check if file was already processed (path-based)
    if (processedFiles[filePath]) {
      console.log(`Skipping ${filename} (already processed)`);
      return;
    }
    
    console.log(`Preparing to upload: ${filename}`);
    
    // Create form data
    const formData = new FormData();
    formData.append('images', fs.createReadStream(filePath));
    const APIToken = process.env.API_TOKEN; // Ensure you have your token set in environment variables
    // Upload file
    console.log(`Uploading ${filename}...`);
    const response = await axios.post(serverUrl, formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${APIToken}`
      },
      params: {
        nodeId: 4
      }
    });
    
    if (response.data.success) {
      console.log(`Successfully uploaded ${filename}`);
      console.log(`URL: ${response.data.file.url}`);
      
      // Mark as processed
      processedFiles[filePath] = {
        uploadedAt: new Date().toISOString(),
        serverPath: response.data.file.url,
        imageId: response.data.imageId
      };
      
      // Store file hash for content-based deduplication
      if (!fileHashes[fileHash]) {
        fileHashes[fileHash] = [];
      }
      fileHashes[fileHash].push(filePath);
      
      saveProcessedFiles();
    } else {
      console.error(`Failed to upload ${filename}: ${response.data.message}`);
    }
  } catch (error) {
    console.error(`Error processing ${filename}:`, error.message);
    if (error.response) {
      console.error('Server response:', error.response.data);
    }
  }
}

// Batch upload all files in the folder
async function uploadAllFiles() {
  try {
    // First clean up processed files log
    await cleanupProcessedFiles();
    
    const files = await fs.promises.readdir(sourceFolder);
    const imageFiles = files.filter(file => {
      return /\.(jpg|jpeg|png|gif)$/i.test(file);
    });
    
    console.log(`Found ${imageFiles.length} image files to process`);
    
    for (const file of imageFiles) {
      const filePath = path.join(sourceFolder, file);
      await uploadFile(filePath);
    }
    
    console.log('Finished processing all files');
  } catch (error) {
    console.error('Error reading source folder:', error);
  }
}

// Set up file watcher
function setupWatcher() {
  console.log(`Watching for new images in ${sourceFolder}`);
  
  const watcher = chokidar.watch(sourceFolder, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100
    }
  });
  
  watcher
    .on('add', async filePath => {
      if (/\.(jpg|jpeg|png|gif)$/i.test(filePath)) {
        console.log(`New image detected: ${path.basename(filePath)}`);
        await uploadFile(filePath);
      }
    })
    .on('unlink', filePath => {
      // When a file is removed, clean it from tracking
      if (processedFiles[filePath]) {
        console.log(`Removing tracking for deleted file: ${path.basename(filePath)}`);
        delete processedFiles[filePath];
        saveProcessedFiles();
      }
    })
    .on('error', error => console.error(`Watcher error: ${error}`));
  
  console.log('Watcher started. Press Ctrl+C to stop.');
}

// Main function
async function main() {
  // Initial upload of all existing files
  await uploadAllFiles();
  
  // Then start watching for new files
  setupWatcher();
}

// Start the client
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});