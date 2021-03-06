var User 		= require('../models/user');
var url  		= require('url');
var AppRule 	= require('../config/apprule-engine');
var jwt    		= require('jsonwebtoken');
var config 		= require('../config/config');

var ReqJsonValidator = require('../src/validator/request-json-validator');

module.exports = function(app, passport) {
    // =====================================
    // HOME PAGE (with login links) ========
    // =====================================
    app.get('/', function(req, res) {
        res.render('public/index.ejs'); // load the index.ejs file
    });
    
    app.get('/view/:*', function (req, res) {
        var name = req.params.name;
        res.render('public/' + req.params[0]);
    });
    
    app.get('/secureview/:*', function (req, res) {
        var name = req.params.name;
        res.render('private/' + req.params[0]);
    });
    
    // =====================================
    // FORGOT Password =====================
    // =====================================
    app.get('/auth/forgot/:email', function (req, res) {
        // render the page and pas,s in any flash data if it exists
        //res.render('index.ejs', { message: { 'error': true, 'errorType': "loginError", "description": req.flash('loginMessage') } });
		adminTask.isEmailExist(req.params.email,function(a){
			if(!a){
				req.flash = {'forgotMessage':"No emailid found."};
				res.json({ 'error': true, 'errorType': "forgotError", "description": req.flash.forgotMessage});
				return;
			}else{
				adminTask.resetPassword(req.params.email,req,function(b,user){
					if(b){
						res.json({ 'error': false, 'errorType': "", "description": "done" });
						return;
					}
				});
			}
		});
		        
    });
	
    // =====================================
    // Change Password =====================
    // =====================================
	app.post('/auth/changepassword', AppRule.validateToken, ReqJsonValidator.changepasswordSchema, function (req, res) {
        // render the page and pas,s in any flash data if it exists
        //res.render('index.ejs', { message: { 'error': true, 'errorType': "loginError", "description": req.flash('loginMessage') } });
		adminTask.changePassword(req.user._id,req.body.oPwd,req.body.nPwd,function(a){
			if(!a){
				req.flash = {'passwordMessage':"Incorrect password."}
				res.json({ 'error': true, 'errorType': "passwordError", "description": req.flash.passwordMessage});
				return;
			}else{
				res.json({ 'error': false, 'errorType': "", "description": "done" });
			}
		});
		        
    });
	
    
    // =====================================
    // LOGIN ===============================
    // =====================================
 
	app.post('/login', function(req, res, next) {
	  passport.authenticate('local-login',function(err, user, info){
			if (err) { return next(err); }
			if (!user) {
				//return res.redirect('/login'); 
				return  res.render('public/index.ejs', {message:{'error':true,'errorType':"loginError","description":req.flash.loginMessage}});
			}
			req.logIn(user, function(err) {
			  if (err) { return next(err); }
			  updateLoginInfo(req,user);
			  var token = AppRule.getNewToken(user,res);
			  res.setHeader("token", token);
			  res.redirect('/profile?token='+token);
				});
		})(req, res, next);
	});

    
    // =====================================
    // SIGNUP ==============================
    // =====================================
    // show the signup form
    app.get('/signup', function(req, res) {
		res.render('public/signup.ejs', { message: {}});
    });

	app.post('/signup', function(req, res, next) {
		passport.authenticate('local-signup',function(err, user, info){
				if (err) { return next(err); }
				if (!user) {return  res.render('public/signup.ejs', {message:req.flash.signupMessage});}
				req.logIn(user, function(err) {
				  if (err) { return next(err); }
				  res.render('public/signup-done.ejs');
				});
			})(req, res, next);
	});

    // =====================================
    // PROFILE SECTION =====================
    // =====================================
    // we will want this protected so you have to be logged in to visit
    // we will use route middleware to verify this (the isLoggedIn function)
	
	  app.get('/profile', AppRule.validateTokenBeforeOnPage, function(req, res) {
		 res.render('private/profile.ejs', {"fullname" :req.user.fullname ,"role":req.user.role,"token":res._headers.token,uinkey:req.user.uinkey,"signby":getLoginBy(req.user)});
      });
	  
	  app.get('/isAuthenticated', AppRule.validateToken, function(req, res) {
			res.send();
      });
	  
	  function isEmpty(obj) {
		  var i = !Object.keys(obj).length > 0;
		  return i
	  }
	  
	  function getLoginBy(aUsr){
		 var signfrom;
		 signfrom = "local"
		 return signfrom;
	  }
	  
   

	function updateLoginInfo(req,user){
		User.findOneAndUpdate({"_id":user._id},{$set:{"sessioninfo.islogin":1,'sessioninfo.useragent':req.headers['user-agent'],'sessioninfo.ip':req.headers['x-forwarded-for'] || req.connection.remoteAddress}},{upsert:true},function(er1,obj){
							if(er1) throw er1;
		});
	}	


  
	

    
    // =====================================
    // LOGOUT ==============================
    // =====================================
    app.get('/logout', function(req, res) {
		var token = req.headers['token'] || req.body.token || req.query.token;
		if (token) {
			jwt.verify(token,config.sessionSecret, function(err, decoded) {
			  if (err) {
				 if(err.name === "TokenExpiredError"){
					 var new_decoded = jwt.decode(token,{complete: true});
					 User.findOneAndUpdate({"_id":new_decoded.payload._id},{$set:{"lastlogouttime":new Date(),"sessioninfo.islogin":0}},{upsert:true},function(err,user){
						if(err) throw err;
						return res.redirect('/');
					});
				 }
			  } else {
				var new_decoded = jwt.decode(token,{complete: true});
				 User.findOneAndUpdate({"_id":new_decoded.payload._id},{$set:{"lastlogouttime":new Date(),"sessioninfo.islogin":0}},{upsert:true},function(err,user){
					if(err) throw err;
					return res.redirect('/');
				});
			  }
			});
		}		
    });
};
