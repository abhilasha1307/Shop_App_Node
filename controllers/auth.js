const Users = require('../models/user');
const bcrypt = require('bcryptjs');
const nodemailer = require("nodemailer");
const crypto = require('crypto');
const { validationResult } = require('express-validator'); //gather errors thrown by validation middleware

const transport = nodemailer.createTransport({
  host: "smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: "245b0491ba639a",
    pass: "4dc843efa6c71b"
  }
});

exports.getLogin = (req, res, next) => {
  let message = req.flash('error'); //whatever is stored in 'error' will be retrieved and stored in errorMessage, and thereafter removed from sessions
  if (message.length > 0) {
    message = message[0];
  }
  else {
    message = null;
  }
  res.render('auth/login', {
    path: '/login',
    docTitle: 'Login',
    errorMessage: message,
    oldInput: { email: '', password: '' },
    validationErrors: []
  });
};

exports.getSignup = (req, res, next) => {
  let message = req.flash('error');
  if (message.length > 0) {
    message = message[0];
  }
  else {
    message = null;
  }
  res.render('auth/signup', {
    path: '/signup',
    docTitle: 'Signup',
    errorMessage: message,
    oldInput: { email: '', password: '', confirmPassword: '' },
    validationErrors: []
  });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render('auth/login', {
      path: '/login',
      docTitle: 'Login',
      errorMessage: errors.array()[0].msg,
      oldInput: {
        email: email,
        password: password
      },
      validationErrors: errors.array()
    });
  }
  Users.findOne({ email: email })
    .then(user => {
      if (!user) {
        return res.status(422).render('auth/login', {
        path: '/login',
        docTitle: 'Login',
        errorMessage: 'Invalid email or password',
        oldInput: {
          email: email,
          password: password
        },
        validationErrors: [] //to not give away what exactly failed
    });
      }
      bcrypt
        .compare(password, user.password)
        .then(doMatch => {
          if (doMatch) {
            req.session.isLoggedIn = true;
            req.session.user = user;
            return req.session.save(err => { //?
              console.log(err);
              res.redirect('/');
            });
          }
          return res.status(422).render('auth/login', {
            path: '/login',
            docTitle: 'Login',
            errorMessage: 'Invalid email or password',
            oldInput: {
              email: email,
              password: password
            },
            validationErrors: [] //to not give away what exactly failed
        });
        })
        .catch(err => {
          console.log(err);
          res.redirect('/login');
        });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode(500);
      return next(error);
    });
};

exports.postSignup = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render('auth/signup', {
      path: '/signup',
      docTitle: 'Signup',
      errorMessage: errors.array()[0].msg,
      oldInput: { email: email, password: password, confirmPassword: req.body.confirmPassword },
      validationErrors: errors.array()
    });
  }
  bcrypt.hash(password, 12).then(hashedPassword => {
    const New_user = new Users({
      email: email,
      password: hashedPassword,
      cart: { items: [] }
    })
    return New_user.save();
  }).then(result => {
    let msg = {
      from: email,
      to: 'shopnodejs23@gmail.com',
      subject: 'SignUp Successful!',
      html: '<h1>Congratulations! You successfully signed up</h1>'
    }
    res.redirect('/login')
    transport.sendMail(msg, (error, info) => {  //dont use in a blocking way
      if (error) {
        return console.log(error);
      }
      console.log('MESSAGE SENT: %s', info.messageId);
    })
  }).catch(err => {
    const error = new Error(err);
    error.httpStatusCode(500);
    return next(error);
  })
};


//to clear the current session in the DB
exports.postLogout = (req, res, next) => {
  //.destroy is provided by the middleware
  //inner function is called when the session is destroyed
  req.session.destroy((err) => {
    console.log(err);
    res.redirect('/');
  })
};

exports.getReset = (req, res, next) => {
  let message = req.flash('error'); //whatever is stored in 'error' will be retrieved and stored in errorMessage, and thereafter removed from sessions
  if (message.length > 0) {
    message = message[0];
  }
  else {
    message = null;
  }
  res.render('auth/reset', {
    path: '/reset',
    docTitle: 'Reset Password',
    errorMessage: message,
  });
};

exports.postReset = (req, res, next) => {
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log(err);
      return res.redirect('/reset')
    }
    const token = buffer.toString('hex');
    Users.findOne({ email: req.body.email })
      .then(user => {
        if (!user) {
          req.flash('error', 'No account with that email found.');
          return res.redirect('/reset');
        }

        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 3600000;
        return user.save();
      })
      .then(result => {
        if (result) {
          res.redirect('/');
          let msg_reset = {
            from: req.body.email,
            to: 'shopnodejs23@gmail.com',
            subject: 'Password Reset',
            html: `
        <p>You requested a password reset</p>
        <p>Click the <a href = http://localhost:3000/reset/${token}>LINK</a> to set a new password</p>
        <p>The Link is valid only for an hour from the time of request</p>
      `
          }
          transport.sendMail(msg_reset, (error, info) => {  //dont use in a blocking way
            if (error) {
              return console.log(error);
            }
            console.log('MESSAGE SENT: %s', info.messageId);
          })
        }
      })
      .catch(err => {
        const error = new Error(err);
        error.httpStatusCode(500);
        return next(error);
      })
  })
}

exports.getNewPassword = (req, res, next) => {
  const token = req.params.token;
  Users.findOne({ resetToken: token, resetTokenExpiration: { $gt: Date.now() } })
    .then(user => {
      let message = req.flash('error');
      if (message.length > 0) {
        message = message[0];
      }
      else {
        message = null;
      }
      res.render('auth/newPassword', {
        path: '/new-password',
        docTitle: 'New Password',
        errorMessage: message,
        userId: user._id.toString(),
        passwordToken: token
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode(500);
      return next(error);
    })
}

exports.postNewPassword = (req, res, next) => {
  const newPassword = req.body.password;
  const userId = req.body.userId;
  const passwordToken = req.body.passwordToken

  let resetUser;

  Users.findOne({ resetToken: passwordToken, resetTokenExpiration: { $gt: Date.now() }, _id: userId })
    .then(user => {
      resetUser = user;
      return bcrypt.hash(newPassword, 12);
    })
    .then(hashedPassword => {
      resetUser.password = hashedPassword;
      resetUser.resetToken = undefined;
      resetUser.resetTokenExpiration = undefined;

      return resetUser.save();
    })
    .then(result => {
      res.redirect('/login')
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode(500);
      return next(error);
    })

}