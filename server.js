//testnow
// server.js
// set up ======================================================================
// get all the tools we need
var config          	= require('./config/config.js');
var fayeConf        	= require('./config/faye-conf.js');
var path            	= require('path');
var busboy 				= require('connect-busboy');
var morgan         		= require('morgan');
var cookieParser    	= require('cookie-parser');
var bodyParser     		= require('body-parser');
var faye                = require('faye');
var mongoose            = require('mongoose');
var passport            = require('passport');
var express             = require('express');
var favicon             = require('serve-favicon');
var http                = require('http');
var jwt    				= require('jsonwebtoken'); // used to create, sign, and verify tokens
//
var app                 = express();
var port                = process.env.PORT || config.port;


// configuration ===============================================================
console.log("######################STARTING SERVER#############################");
app.set('env',config.environment);
console.log("Env : ",app.get('env'));
mongoose.connect(config.url); // connect to our database
require('./config/passport')(passport); // pass passport for configuration

// set up our express application
app.use(busboy());
app.use(express.static(path.join(__dirname, config.staticPrivateDir), {expires: new Date(Date.now() + 60 * 10000),maxAge: 60*10000 }));
app.use(express.static(path.join(__dirname, config.staticPublicDir), {expires: new Date(Date.now() + 60 * 10000),maxAge: 60*10000 }));
app.use(favicon(__dirname + '/'+ config.staticPublicDir + '/favicon.ico'));

// view engine
/*
app.engine('.html', require('ejs').__express);
app.set('views', __dirname + config.viewsDir);
app.set('view engine', 'html');
*/
if (app.get('env') === 'development') {
	app.use(morgan(':method :url :response-time')); // log every request to the console
}else{
	app.use(morgan(':date[web] :method :url :response-time'));
}
app.use(cookieParser()); // read cookies (needed for auth)
app.use(bodyParser.json({ limit: '1mb' })); // get information from html forms 
app.use(bodyParser.raw());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(require('express-nocaptcha')({secret: config.recaptchasecretkey}));

app.set('views', __dirname + config.viewsDir);
app.set('view engine', 'ejs'); // set up ejs for templating


// required for passport
//app.set("superSecret", config.sessionSecret);
//app.use(session({ secret: config.sessionSecret, cookie: {expires: new Date(Date.now() + 60 * 10000),maxAge: 60*10000 } })); // session secret
app.use(passport.initialize());
//app.use(passport.session()); // persistent login sessions
//app.use(flash()); // use connect-flash for flash messages stored in session




app.post('/message', function(req, res) {
   // bayeux.getClient().publish('/channel-1', { text: req.body.message });
   fayeConf.pulishMessage('/channel-1', { msg: "I found now"});
   //bayeux.getClient().publish('/channel-1', { msg: "I found now"});
    console.log('broadcast message:' + req.body.message);
    res.send(200);
});

app.use(function (req, res, next) {
    //console.log('Time:', Date.now());
	//console.log("Header:",req.get("token"));
    // res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate, max-age=600000');
    // res.header('Expires', '-1');
    //res.header('Pragma', 'no-cache');
    next();
});


// routes ======================================================================
require('./routes/routes.js')(app, passport); // load our routes and pass in our app and fully configured passport
app.use("/secureinfo/gateway",require('./routes/secureinfo-routes.js'));
app.use("/publicpostinfo/gateway",require('./routes/publicinfo-routes.js'));
// launch ======================================================================




// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    //message: "Technical error found.",
    //error: {}
	message: err,
    error: err
  });
});

var server = app.listen(port,config.hostname);
fayeConf.getBayeux().attach(server);
console.log('The magic happens on '+config.hostname+":"+port);
