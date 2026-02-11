const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Check if running on Railway with a Volume
        let uploadPath = 'public/uploads/';
        
        if (process.env.RAILWAY_VOLUME_MOUNT_PATH) {
            uploadPath = path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'uploads');
        }

        // Create folder if it doesn't exist
        if (!fs.existsSync(uploadPath)){
            fs.mkdirSync(uploadPath, { recursive: true });
        }

        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});


const upload = multer({
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // CHANGE THIS: Increased to 100MB
    fileFilter: (req, file, cb) => {
        // We need to allow ZIP files now, not just images!
        checkFileType(file, cb);
    }
});

function checkFileType(file, cb) {
    // ALLOW ZIP FILES
    const filetypes = /jpeg|jpg|png|gif|zip|x-zip-compressed/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    // ZIP mimetypes can vary, so we rely mostly on extension for zip
    if (path.extname(file.originalname).toLowerCase() === '.zip') {
        return cb(null, true);
    }

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: Images or Zip Only!');
    }
}

module.exports = upload;