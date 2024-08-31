var express = require("express");
var router = express.Router();
const usermodel = require("../modules/Users");
const postmodel = require('../modules/Post')
const messagemodel = require('../modules/messege')
const passport = require("passport");
const { isLoggedIn } = require("../middleware/isLoggedin");
const upload = require("./multer");
const { path } = require("path");
const { post } = require(".");
const LocalStrategy = require("passport-local").Strategy;

passport.use(new LocalStrategy(usermodel.authenticate()));

router.get("/", function (req, res) {
  res.render("index", { footer: false });
});

router.get("/login", function (req, res) {
  res.render("login", { footer: false, error: req.flash("error") });
});

router.get("/feed", isLoggedIn, async function (req, res) {
  const user = await usermodel.findOne({username:req.session.passport.user});
  const post = await postmodel.find().populate("user");
  res.render("feed", { footer: true, post:post , user:user });
});

router.get("/profile", isLoggedIn, async function (req, res) {
  const user = await usermodel.findOne({ username: req.session.passport.user }).populate("post");
  res.render("profile", { footer: true , user: user });
});

router.get("/search", isLoggedIn, function (req, res) {
  res.render("search", { footer: true });
});

router.get("/edit", isLoggedIn, async function (req, res) {
  const user = await usermodel.findOne({ username: req.session.passport.user });
  res.render("edit", { footer: true, user: user });
});

router.get("/upload", isLoggedIn, function (req, res) {
  res.render("upload", { footer: true });
});



// socket.io for messege code start 

// Fetch users with chat history
router.get("/messages", isLoggedIn, async function (req, res) {
  try {
    const currentUser = await usermodel.findOne({ username: req.session.passport.user });

    // Fetch users who have chat history with the current user
    const usersWithChats = await messagemodel.aggregate([
      {
        $match: {
          $or: [
            { sender: currentUser._id },
            { receiver: currentUser._id }
          ]
        }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$sender", currentUser._id] },
              "$receiver",
              "$sender"
            ]
          }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user"
        }
      },
      {
        $unwind: "$user"
      }
    ]);

    // Format the result to get the user data
    const users = usersWithChats.map(user => user.user);

    res.render("messages", { footer: true, users, selectedUser: null, messages: [], user:currentUser });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});



// Fetch chat history with a specific user
router.get("/messages/:userId", isLoggedIn, async function (req, res) {
  try {
    const currentUser = await usermodel.findOne({ username: req.session.passport.user });
    const selectedUser = await usermodel.findById(req.params.userId);

    if (!selectedUser) {
      return res.status(404).send('User not found');
    }

    const messages = await messagemodel.find({
      $or: [
        { sender: currentUser._id, receiver: selectedUser._id },
        { sender: selectedUser._id, receiver: currentUser._id }
      ]
    }).sort({ timestamp: 'asc' });

    res.render("messages", { footer: true, users: [], selectedUser, messages, user: currentUser });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});




// Handle sending messages
router.post('/messages/:userId', isLoggedIn, async function (req, res) {
  try {
    const user = await usermodel.findOne({ username: req.session.passport.user });

    const newMessage = new messagemodel({
      sender: user._id,
      receiver: req.params.userId,
      message: req.body.message
    });

    await newMessage.save();

    res.redirect(`/messages/${req.params.userId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});
// socket.io for messege code end




router.get("/username/:username", isLoggedIn,async function (req, res) {
  const search = new RegExp(`^${req.params.username}`,'i')
  const user = await usermodel.find({username:search});
  res.json(user);
});

router.get("/like/post/:id", isLoggedIn,async function (req, res) {
  const user = await usermodel.findOne({username:req.session.passport.user});
  const post = await postmodel.findOne({_id: req.params.id});

  // if already liked removed like
  // if not liked it 

  if(post.likes.indexOf(user._id) == -1){
    post.likes.push(user._id)
  }
  else{
    post.likes.splice(post.likes.indexOf(user._id),1)
  }

  await post.save();
  res.redirect("/feed")
});


router.post('/upload',isLoggedIn,upload.single("image"), async function(req,res){
  const user = await usermodel.findOne({username:req.session.passport.user});
  const post =await  postmodel.create({
    picture:req.file.filename,
    caption: req.body.caption,
    user:user._id
    })
    user.post.push(post._id)
    await user.save();
    res.redirect('/feed')
})

// Register Route using passport local
router.post("/register", async (req, res, next) => {
  const { username, name, email, password } = req.body;

  try {
    // Create a new user instance
    const userData = new usermodel({ username, email, name });

    // Register the user with Passport.js
    await usermodel.register(userData, password);

    // Authenticate the user and redirect to profile
    passport.authenticate("local")(req, res, function () {
      res.redirect("/profile"); // Redirect to profile after successful registration
    });
  } catch (err) {
    console.error(err);
    res.redirect("/register"); // Redirect back to register page on error
  }
});

// login Route using passport local
router.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/profile", // Redirect to this route on successful login
    failureRedirect: "/login", // Redirect to login on failure
    failureFlash: true, // Allow flash messages
  }),
  (req, res) => {}
);

// update user details
router.post("/update", isLoggedIn, upload.single('image'), async function (req, res) {
  try {
    const user = await usermodel.findOneAndUpdate(
      { username: req.session.passport.user },
      { username: req.body.username, name: req.body.name, bio: req.body.bio },
      { new: true }
    );

    if (req.file) { // Check if a new image was uploaded taki purani picture ki link ko naye se change kar sakte 
      user.picture = req.file.filename; // Update picture with new filename
      await user.save(); // Save updated user object
    }

    req.login(user, function (err) {
      if (err) throw err;
      res.redirect("/profile");
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error updating profile');
  }
});

// user logout
router.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

module.exports = router;
