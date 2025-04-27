import mongoose from 'mongoose';

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/CodeOverflow');

// Define userSchema
const userSchema = mongoose.Schema({
    fname: String,
    lname: String,
    mob: Number,
    git: String,
    image: String,
    mail: String,
    pass: String,
    posts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post"  // Make sure you're referencing the correct model name ("Post")
    }],
    address: String
});

// Create the model
const userModel = mongoose.model('User', userSchema);

// Export the model
export default userModel;
