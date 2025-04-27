import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv'; // Load env variables
import fetch from 'node-fetch';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { marked } from 'marked';
import path from 'path';
import session from 'express-session';
import multer from 'multer';
import flash from 'connect-flash';
import { body, validationResult } from 'express-validator';
import userModel from './Models/user.js';
import postModel from './Models/posts.js';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
dotenv.config();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: 'secret', // hardcoded
  resave: false,
  saveUninitialized: true,
}));
app.use(flash());
app.use(express.static(path.join(__dirname, 'Public')));
app.set('images', path.join(__dirname, 'Public/images'));
app.set('views', path.resolve('D:/Downloads/CodeOverflow/Views')); 
app.set('view engine', 'ejs');

const upload = multer({ dest: 'Public/uploads/' });

// ---------------- ROUTES ---------------- //

// Home
app.get('/', (req, res) => {
  let messages = { error: req.flash('error') };
  res.render('Home', { messages });
});

// Register page
app.get('/register', (req, res) => {
  let messages = { error: req.flash('error') };
  res.render('Register', { messages });
});

// Handle Register
app.post('/register', upload.single('file-upload'), [
  body('fname').notEmpty().withMessage('First name is required'),
  body('lname').notEmpty().withMessage('Last name is required'),
  body('mob').isMobilePhone().withMessage('Invalid mobile number'),
  body('mail').isEmail().withMessage('Invalid email address'),
  body('pass').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('git').optional().isURL().withMessage('Invalid GitHub profile URL'),
  body('address').optional().trim().escape()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error', errors.array().map(err => err.msg).join(', '));
    return res.redirect('/register');
  }

  try {
    const { fname, lname, mob, mail, address, git, pass } = req.body;
    const existingUser = await userModel.findOne({ mail });

    if (existingUser) {
      req.flash('error', 'Email already exists. Please use a different email.');
      return res.redirect('/register');
    }

    let image = '/images/default-user-icon.jpg';
    if (req.file) {
      image = `/uploads/${req.file.filename}`;
    }

    const hash = bcrypt.hashSync(pass, bcrypt.genSaltSync(10));

    const user = await userModel.create({
      fname, lname, address, mob, git, mail, pass: hash, image
    });

    let token = jwt.sign({ mail: user.mail }, 'secret'); // hardcoded jwt secret
    res.cookie("token", token);

    res.redirect('/main');
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal server error');
  }
});

// Login
app.post('/login', async (req, res) => {
  const { mail, pass } = req.body;
  const user = await userModel.findOne({ mail });

  if (!user) {
    req.flash('error', 'Invalid email or password');
    return res.redirect('/');
  }

  bcrypt.compare(pass, user.pass, (err, result) => {
    if (result) {
      let token = jwt.sign({ mail: user.mail }, 'secret'); // hardcoded jwt secret
      res.cookie("token", token);
      res.redirect('/main');
    } else {
      req.flash('error', 'Invalid email or password');
      res.redirect('/');
    }
  });
});

// Middleware to check login
function isloggedin(req, res, next) {
  if (!req.cookies.token) return res.redirect('/');
  try {
    const data = jwt.verify(req.cookies.token, 'secret'); // hardcoded jwt secret
    req.user = data;
    next();
  } catch (err) {
    res.redirect('/');
  }
}

// Main Dashboard
app.get('/main', isloggedin, async (req, res) => {
  try {
    const posts = await postModel.find()
    .sort({ date: -1 })
      .populate("user")
      .populate("comments.user");

    const currentUser = await userModel.findOne({ mail: req.user.mail });
    if (!currentUser) {
      req.flash('error', 'User not found');
      return res.redirect('/');
    }

    const messages = { error: req.flash('error') };
    res.render('dashboard', { posts, user: currentUser, messages, aiAnswer: undefined });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal server error');
  }
});

// Create a post
app.post('/posts', isloggedin, async (req, res) => {
  try {
    const user = await userModel.findOne({ mail: req.user.mail });
    const content = req.body.content.trim();

    if (!content) {
      req.flash('error', 'Post content cannot be empty');
      return res.redirect('/main');
    }

    const post = await postModel.create({
      user: user._id,
      content
    });

    user.posts.push(post._id);
    await user.save();

    res.redirect('/main');
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal server error');
  }
});

// Like / Unlike a post
app.post('/like/:postId', isloggedin, async (req, res) => {
  try {
    const post = await postModel.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const user = await userModel.findOne({ mail: req.user.mail });

    const likedIndex = post.likes.indexOf(user._id.toString());

    if (likedIndex === -1) {
      post.likes.push(user._id);
    } else {
      post.likes.splice(likedIndex, 1);
    }

    await post.save();
    res.json({ likes: post.likes.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

// Comment on a post
app.post('/comment/:postId', isloggedin, async (req, res) => {
  try {
    console.log(req.params.postId);

    const { text } = req.body;
    const { postId } = req.params;
    const user = await userModel.findOne({ mail: req.user.mail });
    const post = await postModel.findById(postId);

    if (!post) return res.status(404).send("Post not found");

    // Create the comment
    const comment = { user: user._id, content: text };

    // Add comment to post
    post.comments.push({
      text: text, 
      user: user._id
    });

    await post.save(); // Save the updated post with the new comment

    res.redirect('/main'); // Redirect to the main page or wherever you want
  } catch (err) {
    console.error(err);
    res.status(500).send("Error while commenting");
  }
});

// Ask AI

app.post('/ask-ai', async (req, res) => {
    const { question } = req.body;
  
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer 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`, // Replace with your actual Groq API Key
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          messages: [{ role: "user", content: question }],
        }),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Groq API Error:', errorData);
        return res.status(500).json({ error: 'Groq API error occurred.' });
      }
  
      const responseData = await response.json(); // Get the full response at once
      console.log('Response from AI:', responseData.choices[0].message.content); // Log the full response for debugging
  
      // Extract the assistant's message content from the response
      const message = responseData.choices[0]?.message?.content;
  
      if (message) {
        res.json({ success: true, choices: [{ message: { content: message } }] }); // Send the correct structure to the frontend
      } else {
        res.status(500).json({ error: 'No message found in AI response.' });
      }
  
    } catch (error) {
      console.error('Server Error:', error.message);
      res.status(500).json({ error: 'Something went wrong while talking to AI.' });
    }
  });
  
  
  
  
  
  

// Logout
app.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
});

const NEWS_API_KEY = '055d2253b47c4fa1b315164034898ee3'; // get it free from newsapi.org

app.get('/updates', async (req, res) => {
  try {
    const newsResponse = await fetch(`https://newsapi.org/v2/top-headlines?category=technology&language=en&pageSize=5&apiKey=${NEWS_API_KEY}`);
    const newsData = await newsResponse.json();

    const articles = newsData.articles.map(article => ({
      title: article.title,
      description: article.description,
      url: article.url
    }));

    res.json({ success: true, articles });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch updates." });
  }
});

  
// Start server
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
