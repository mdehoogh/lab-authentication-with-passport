const express        = require("express");
const passportRouter = express.Router();
// Require user model
const User           = require('../models/user.js');
// Add bcrypt to encrypt passwords
const bcrypt         = require('bcrypt');

// Add passport 

const passport       = require('passport');
const LocalStrategy  = require('passport-local').Strategy;
// will take care of loggin' in the user ourselves
passport.use(new LocalStrategy(function(username,password,done){
  User.findOne({username:username},function(err,user){
    if(err)return done(err);
    // console.log("No err");
    if(!user)return done(null,false,{message:'Invalid credentials.'});
    // console.log("Existing user!");
    /*
    if(bcrypt.compareSync(password,user.password))
      return done(null,user);
    return done(new Error("Invalid password"));
    */
    bcrypt.compare(password,user.password,(err,correct)=>{
      // MDH@23DEC2019: apparently this format is required to make flash work
      //                done(new Error('some message')); didn't flash anything!
      if(err||!correct)return done(null,false,{message:'Invalid credentials!'});
      // console.log("Right password!");
      return done(null,user);
    });
    /* replacing the sync version
    if(!user.validPassword(password))
      return done(null,false,{message:'Incorrect password!'});
    return done(null,user);
    */
  })
}));

passportRouter.use(passport.initialize());
passportRouter.use(passport.session());

// register (de)serializeUser functions to passport
passport.serializeUser(function(user, done) {
  done(null, user.username); // not the id but the username in our case
});

passport.deserializeUser(function(username, done) {
  User.findOne({username:username}, function(err, user) {
    done(err, user);
  });
});

const ensureLogin    = require("connect-ensure-login");

passportRouter.get("/private-page", ensureLogin.ensureLoggedIn(), (req, res) => {
  res.render("passport/private", { user: req.user });
});

// signup route
passportRouter.get("/signup",(req,res,next)=>{
  console.log("Rendering signup!");
  res.render('passport/signup');
});
passportRouter.get("/login",(req,res,next)=>{
  // DON'T CALL req.flash('error') here as it will consume it!!!! console.log("Rendering login",req.flash('error'));
  res.render("passport/login",{ error: req.flash('error') });
});

passportRouter.post("/signup",(req,res,next)=>{
  // receiving form data in req.body
  let username=req.body.username;
  bcrypt.hash(req.body.password,10,(err,hash)=>{
    if(err)return next(err);
    if(!hash)throw new Error("Failed to hash the password.");
    // ready to create a new user with the given name and password (hash)
    User.create({username:username,password:hash})
    .then((user)=>{
      if(!user)throw new Error("Failed to create user.");
      res.redirect('/passport/login'); // login assumed at same level
    })
    .catch((err)=>{
      next(err);
    });
  });
});

// login authentication is dealt with by Passport
passportRouter.post("/login",passport.authenticate('local',
  {successRedirect:'private-page',failureRedirect:'login',failureFlash:true}));

module.exports = passportRouter;