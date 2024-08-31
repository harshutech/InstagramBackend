var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const expressSession = require('express-session');
var indexRouter = require('./routes/index');
var usersRouter = require('./modules/Users');
const flash = require('connect-flash');
const passport = require('passport');
const connectToMongo = require('./config/databaseConfig');
const messagemodel = require('./modules/messege')
const socketIo = require('socket.io');

connectToMongo();

var app = express();

// socket connection code start 
const server = require('http').createServer(app); // Create HTTP server
const io = socketIo(server); // Initialize Socket.IO
// socket connection code end

// Middleware
app.use(flash());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Express session and passport middleware
app.use(expressSession({
  resave: false,
  saveUninitialized: false,
  secret: "Ionpwpmfoospanfhw"
}));
app.use(passport.initialize());
app.use(passport.session());
passport.serializeUser(usersRouter.serializeUser());
passport.deserializeUser(usersRouter.deserializeUser());

// socket connection code start 

// Handle Socket.IO connections
io.on('connection', (socket) => {
  console.log('A user connected');

  // Join a room based on user ID
  socket.on('joinRoom', (userId) => {
      console.log(`User ${userId} joined room`);
      socket.join(userId);
  });

  // Listen for messages
  socket.on('sendMessage', async (data) => {
      console.log('Message received on server:', data);

      // Save the message to the database
      try {
          const newMessage = new messagemodel({
              sender: data.sender,
              receiver: data.receiver,
              message: data.message,
              timestamp: new Date()  // Set the timestamp
          });

          await newMessage.save();  // Save to the database

          // Emit the message to the receiver and sender (both sides should see it)
          io.to(data.receiver).emit('receiveMessage', data);
      } catch (error) {
          console.error('Error saving message:', error);
      }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
      console.log('User disconnected');
  });
});

// socket connection code end


// Routes
app.use('/', indexRouter);
app.use('/user', usersRouter);

// Catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// Error handler
app.use(function(err, req, res, next) {
  // Set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // Render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = {app, server}; // Export the server, not just the app
