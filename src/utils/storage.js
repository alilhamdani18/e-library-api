const { v4: uuidv4 } = require('uuid');


// Upload file to Google Cloud Storage
const uploadFile = async (bucket, file, folder = '') => {
  try {
    const fileName = `${folder}${folder ? '/' : ''}${uuidv4()}-${file.originalname}`;
    const fileUpload = bucket.file(fileName);

    const stream = fileUpload.createWriteStream({
      metadata: {
        contentType: file.mimetype,
      },
      // public: true, // ❌ Hapus baris ini
    });

    return new Promise((resolve, reject) => {
      stream.on('error', (error) => {
        reject(error);
      });

      stream.on('finish', () => {
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        resolve(publicUrl);
      });

      stream.end(file.buffer);
    });
  } catch (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }
};


// Delete file from Google Cloud Storage
const deleteFile = async (bucket, fileUrl) => {
  try {
    const fileName = fileUrl.split('/').pop();
    const file = bucket.file(fileName);
    await file.delete();
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

module.exports = {
  uploadFile,
  deleteFile
};