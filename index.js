require("./utils.js");
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const saltRounds = 10;

const port = process.env.PORT || 3000;

const app = express();
const Joi = require("joi");

//expire after 1 hour
const expireTime = 60 * 60 * 1000;


var users = [];

/* secret information section */
const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;
const node_session_secret = process.env.NODE_SESSION_SECRET;
/* END secret section */

var {database} = include('databaseConnection');

const userCollection = database.db(mongodb_database).collection('users');

app.use(express.urlencoded({extended: false}));

var mongoStore = MongoStore.create({
  mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/sessions`,
	crypto: {
		secret: mongodb_session_secret
	}
})

app.use(session({ 
  secret: node_session_secret,
	store: mongoStore, //default is memory store 
	saveUninitialized: false, 
	resave: true
}
));

app.get('/', (req,res) => {
  res.send("<h1>Welcome to the site root!</h1>");
});

app.get('/about', (req,res) => {
  var color = req.query.color;
  res.send("<h1 style='color:" + color + ";'>Welcome to the about page!!</h1>");
});

app.get('/gif/:id', (req,res) => {

  var gif = req.params.id;

  if (gif == 1) {
    res.send("<img src='/shake.gif' style='width:500px;'>");
  }
  else if (gif == 2) {
    res.send("<img src='/eat_popcorn.gif' style='width:500px;'>");
  }
  else if (gif > 2 && gif <= 9000) {
    res.send("<img src='/rick_roll.gif' style='width:500px;'>");
  }
  else if (gif >= 9000){
    res.send("<img src='/over_9000.gif' style = 'width:500px;'>");
  }
  else {
    res.send("Invalid gif id: "+ gif);
  }
});

app.get('/contact', (req,res) => {
  var missingEmail = req.query.missing;
  var html = `
    email address:
    <form action='/submitEmail' method='post'>
        <input name='email' type='text' placeholder='email'>
        <button>Submit</button>
    </form>
  `;
  if (missingEmail) {
    html += "<br> email is required";
  }
  res.send(html);
});

app.post('/submitEmail', (req,res) => {
  var email = req.body.email;
  if (!email) {
    res.redirect('/contact?missing=1');
  }
  else {
    res.send("Thanks for subscribing with your email: "+email);
  }
});

app.get('/createUser', (req,res) => {
  var html = `
  create user
  <form action='/submitUser' method='post'>
  <input name='username' type='text' placeholder='username'>
  <input name='password' type='password' placeholder='password'>
  <button>Submit</button>
  </form>
  `;
  res.send(html);
});

app.get('/login', (req,res) => {
  var html = `
  log in
  <form action='/loggingin' method='post'>
  <input name='username' type='text' placeholder='username'>
  <input name='password' type='password' placeholder='password'>
  <button>Submit</button>
  </form>
  `;
  res.send(html);
});

app.post('/submitUser', async (req,res) => {
  var username = req.body.username;
  var password = req.body.password;
  const schema = Joi.object(
  {
    username: Joi.string().alphanum().max(20).required(),
    password: Joi.string().max(20).required()
  });

	const validationResult = schema.validate({username, password});
	if (validationResult.error != null) {
    console.log(validationResult.error);
    res.redirect("/createUser");
    return;
  }

  var hashedPassword = await bcrypt.hash(password, saltRounds);

	await userCollection.insertOne({username: username, password: hashedPassword});
	console.log("Inserted user");

  var html = "successfully created user";
  res.send(html);
});

app.post('/loggingin', async (req,res) => {
  var username = req.body.username;
  var password = req.body.password;

  const schema = Joi.string().max(20).required();
	const validationResult = schema.validate(username);
	if (validationResult.error != null) {
	   console.log(validationResult.error);
	   res.redirect("/login");
	   return;
	}
  const result = await userCollection.find({username: username}).project({username: 1, password: 1, _id: 1}).toArray();

  console.log(result);
	if (result.length != 1) {
  console.log("user not found");
  res.redirect("/login");
  return;
	}
	if (await bcrypt.compare(password, result[0].password)) {
  console.log("correct password");
  req.session.authenticated = true;
  req.session.username = username;
  req.session.cookie.maxAge = expireTime;

  res.redirect('/loggedIn');
  return;
	}
	else {
  console.log("incorrect password");
  res.redirect("/login");
  return;
	}

});

app.get('/loggedin', (req,res) => {
  if (!req.session.authenticated) {
    res.redirect('/login');
  }
  var html = `
  You are logged in!
  `;
  res.send(html);
});

app.get('/logout', (req,res) => {
	req.session.destroy();
    var html = `
    You are logged out.
    `;
    res.send(html);
});

app.use(express.static(__dirname + "/public"));

app.get("*", (req,res) => {
	res.status(404);
	res.send("Page not found - 404");
})

app.listen(port, () => {
	console.log("Node application listening on port " + port);
}); 


