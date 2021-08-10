const path = require('path');

const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session'); 
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');
const multer = require('multer');

const errorController = require('./controllers/error');
const Users = require('./models/user');

const MONGODB_URI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.urnce.mongodb.net/${process.env.MONGO_DEFAULT_DB}?w=majority`;

const app = express();
const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: 'sessions',
});

const csrfProtection = csrf(); //middleware, use it after the session is made. It will use the session

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) =>{
    cb(null, 'images'); //error, destination
  },
  filename: (req, file, cb) =>{
    cb(null, new Date().toISOString().replace(/:/g, '-') + '-' + file.originalname); 
  },
});

const fileFilter = (req, file, cb) =>{
  if(file.mimetype === 'image/png' || file.mimetype === 'image/jpg' ||file.mimetype === 'image/jpeg'){
    cb(null, true);
  }
  else 
  {
    cb(null, false);
  }
};

app.set('view engine', 'ejs'); 
app.set('views', 'views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

app.use(express.urlencoded({ extended: true }))  //for text data. kept for signup form where we still accept urlencoded data
app.use(multer({storage: fileStorage, fileFilter: fileFilter}).single('image'));
app.use(express.static(path.join(__dirname, 'public'))) 
app.use('/images' ,express.static(path.join(__dirname, 'images')));
app.use(session({secret: 'secretKey1', resave: false, saveUninitialized: false, store: store}));

app.use(csrfProtection);
app.use(flash());

app.use((req, res, next) =>{
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken(); //built in function 

  next();
})

//logic for this?
app.use((req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  Users.findById(req.session.user._id)
    .then(user => {
      if(!user){ //if the user is not found; got deleted from the DB in between
        return next();
      }
      req.user = user;
      next();
    })
    .catch(err => {  //does not fire when the user with the said id is not found. Fires when there are technical issues
      //console.log(err)
      next(new Error(err)); //async so have to use next(). In sync, we just throw the error
    }); 
});

app.use('/admin',adminRoutes); 
app.use(shopRoutes);
app.use(authRoutes);

app.use(errorController.get500);
app.use(errorController.get404);
app.use((error, req, res, next) =>{
  res.status(500).render('500', {docTitle: 'Error!', path: '/500', isAuthenticated: req.session.isLoggedIn})
})

mongoose.connect(MONGODB_URI)
.then(result =>{
  app.listen(process.env.PORT || 3000);
})
.catch(err =>{
  console.log(err)
})
