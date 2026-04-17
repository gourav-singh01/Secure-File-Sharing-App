const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
  filename: String,
  originalName: String,
  size: Number,
  type: String,
  url: String,
  uploadedAt: { type: Date, default: Date.now },
  sharedWith: String, // receiver email
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

module.exports = mongoose.model('File', FileSchema);
