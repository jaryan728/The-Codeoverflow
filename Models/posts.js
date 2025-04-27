import mongoose from 'mongoose';

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/CodeOverflow');

// Define postSchema
const postSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Correct capitalization here
    date: { type: Date, default: Date.now },
    content: String,
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Also ensure "User" here
    comments: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // And here
        text: String,
        date: { type: Date, default: Date.now }
    }]
});

// Define the model
const postModel = mongoose.model('Post', postSchema);

// Export the model
export default postModel;
