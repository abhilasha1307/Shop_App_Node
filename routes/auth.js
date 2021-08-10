const express = require('express');
const {check, body} = require('express-validator'); //destructing
const authController = require('../controllers/auth'); 
const Users = require('../models/user')

const router = express.Router();

//to use a route, import it in the app.js file
router.get('/login', authController.getLogin); 

router.get('/signup', authController.getSignup);

router.post(
  '/login', 
  [check('email')
  .isEmail()
  .withMessage('Please enter a valid email')
  .normalizeEmail(),
  body('password','Please enter a valid password').isLength({min: 5}).isAlphanumeric().trim()
  ],
  authController.postLogin); 

  router.post(
  '/signup', 
  [
  check('email')
  .isEmail()
 .withMessage('Please enter a valid email') //default is 'Invalid value'
 .custom((value, {req}) =>{ //check for specific email
  // if(value === 'test@test.com'){
  //  throw new Error('This email address is forbidden');
  // }
  // return true;

  return Users.findOne({email: value}).then(user =>{
    if(user){
      return Promise.reject('Email exists already. Please pick a different one.');
    }
  })
  }).normalizeEmail(), 
  body('password','Please enter a password which has only text and numbers and at least 5 characters').isLength({min: 5}).isAlphanumeric().trim(),

  body('confirmPassword').trim().custom((value, {req}) =>{
    if(value !== req.body.password){
    throw new Error('Passwords must match!');
    }
    return true;
  })

  ]
  , 
 authController.postSignup); //validating the value for email using middleware

router.post('/logout', authController.postLogout); 

router.get('/reset', authController.getReset);

router.post('/reset', authController.postReset);

router.get('/reset/:token', authController.getNewPassword);

router.post('/new-password', authController.postNewPassword);

module.exports = router;


/**
 * check returns an obj. It is a function. 
 * Check in the end will return a middleware. check('email').isEmail() will return a middleware which is understood by express
 * 
 * email field in the incoming request is checked; looks for the field in the queries, body, headers, cookies. After it finds the field, it checks if its valid or not 
 * errors are added on req, which can be retrieved
 * 
 * withMessage() refers to validation method right in front of it
 * You can chain/add more validators
 * 
 * custom((value, {req})).. => value of the field we are checking and optionally from which we can extract things like req or location
 * 
 * make the error message the second argument to body or the check function when the error message is same for all the validators but its not the default 'Invalid value' error message
 * 
 * express-validator package will look for custom validator to return true or false, to return a thrown error, or to return a promise
 * If its a promise, it will wait for promise to resolve and if there is no error, the validation is treated as successful. If there is rejection, the message is stored as error message
 */