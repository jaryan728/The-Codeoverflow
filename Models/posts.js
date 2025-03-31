const mongoose = require('mongoose');

const postSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    date: { type: Date, default: Date.now },
    content: String,
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
    comments: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
        text: String,
        date: { type: Date, default: Date.now }
    }]
});

module.exports = mongoose.model('posts', postSchema);
