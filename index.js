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
  if (!req.session.authenticated) {
    const links = `
      <a href="/signup"><button>Sign Up</button></a>
      <a href="/login"><button>Log In</button></a>
    `;
    const html = `
      <div>
        <h1>Welcome to the Home site!</h1>
        <p>Please sign up or log in</p>
        <div>${links}</div>
      </div>
    `;
    res.send(html);
  }
  else {
    const links = `
      <a href="/members"><button>Members Area</button></a>
      <a href="/logout"><button>Log Out</button></a>
    `;
    const html = `
      <div>
        <h1>Hello, ${req.session.username}!</h1>
        <p>Welcome to the Members area.</p>
        <div>${links}</div>
      </div>
    `;
    res.send(html);
  }
});

app.get('/signup', (req, res) => {
  var html = `
    <h2>Signup:</h2>
    <form action='/submitUser' method='POST'>
      <input type='text' name='username' placeholder='Username'/>
      <br>
      <input type='email' name='email' placeholder='Email'/>
      <br>
      <input type='password' name='password' placeholder='Password'/>
      <br>
      <button>Submit</button>
    </form>
    <a href="/"><button>Return Home</button></a>
    `;
    res.send(html);
});

app.post('/submitUser', async (req,res) => {
  var username = req.body.username;
  var email = req.body.email;
  var password = req.body.password;

  //Empty field check
  if (!username || !email || !password) {
    var errorMsg = "";
    if (!username) {
      errorMsg += "Username is required.<br>";
    }
    if (!email) {
      errorMsg += "Email is required.<br>";
    }
    if (!password) {
      errorMsg += "Password is required.<br>";
    }
    var html = `${errorMsg}<a href="/signup"><button>Try Again</button></a>`;
    res.status(400).send(html);
    return;
  }

  const schema = Joi.object(
  {
    username: Joi.string().alphanum().max(20).required(),
    email: Joi.string().email().required(),
    password: Joi.string().max(20).required()
  });

	const validationResult = schema.validate({username, email,password});
	if (validationResult.error != null) {
    console.log(validationResult.error);
    var html = `
    ${validationResult.error}
    <br>
    <a href="/signup"><button>Try Again</button></a>`;
    res.status(400).send(html);
    return;
  }

  var hashedPassword = await bcrypt.hash(password, saltRounds);

	await userCollection.insertOne({username: username, password: hashedPassword});
	console.log("Inserted user");

  res.redirect("/members");
});

app.get('/login', (req,res) => {
  var html = `
  <h2>Log In</h2>
  <form action='/loggingin' method='post'>
  <input type='email' name='email' placeholder='Email'/>
  <br>
  <input name='password' type='password' placeholder='password'>
  <br>
  <button>Submit</button>
  </form>
  <br>
  <a href="/"><button>Return Home</button></a>
  `;
  res.send(html);
});

/*
TODO
FIX VALIDATION
*/
app.post('/loggingin', async (req,res) => {
  var email = req.body.email;
  var password = req.body.password;

  const schema = Joi.string().email().required();
	const validationResult = schema.validate(email);
	if (validationResult.error != null) {
	  console.log(validationResult.error);
    var html = `
    ${validationResult.error}
    <br>
    <a href="/login"><button>Try Again</button></a>`;
    res.status(400).send(html);
    return;
	}

  const result = await userCollection.find({email: email}).project({email: 1, password: 1, _id: 1}).toArray();

  console.log(result);
	if (await bcrypt.compare(password, result[0].password)) {
    console.log("correct password");
    req.session.authenticated = true;
    req.session.username = username;
    req.session.cookie.maxAge = expireTime;

    res.redirect('/members');
    return;
	}
	else {
    var html = `Invalid email/password combination.<br>
    <a href="/signup"><button>Try Again</button></a>`;
    res.status(400).send(html);
    return;
	}
});

app.get('/members', (req,res) => {
  if (!req.session.authenticated) {
    res.redirect('/');
  }
  var username = req.session.username;
  const randomNum = Math.floor(Math.random() * 3) + 1;
  var html = `
    <h2> Hello, ${username}! </h2>
    <h2>Welcome to the Members Area!</h2>
    <img src="/public/${randomNum}" alt="Random Image">
    <br>
    <a href="/"><button>Return Home</button></a>
    <br>
    <a href="/logout"><button>Log Out</button></a>
  `;
  res.send(html);
});

app.get('/public/:id', (req,res) => {

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

app.get('/logout', (req,res) => {
	req.session.destroy();
  res.redirect('/');
});

app.get('/about', (req,res) => {
  var color = req.query.color;
  res.send("<h1 style='color:" + color + ";'>Welcome to the about page!!</h1>");
});

app.use(express.static(__dirname + "/public"));

app.get("*", (req,res) => {
	res.status(404);
	res.send("Page not found - 404");
})

app.listen(port, () => {
	console.log("Node application listening on port " + port);
}); 
