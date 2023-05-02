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


// app.get('/about', (req,res) => {
//   var color = req.query.color;
//   res.send("<h1 style='color:" + color + ";'>Welcome to the about page!!</h1>");
// });

// app.get('/contact', (req,res) => {
//   var missingEmail = req.query.missing;
//   var html = `
//     email address:
//     <form action='/submitEmail' method='post'>
//         <input name='email' type='text' placeholder='email'>
//         <button>Submit</button>
//     </form>
//   `;
//   if (missingEmail) {
//     html += "<br> email is required";
//   }
//   res.send(html);
// });

// app.post('/submitEmail', (req,res) => {
//   var email = req.body.email;
//   if (!email) {
//     res.redirect('/contact?missing=1');
//   }
//   else {
//     res.send("Thanks for subscribing with your email: "+email);
//   }
// });

/*
TODO
validate inputs
*/
app.get('/signup', (req, res) => {
  var html = `
    <h2>Signup:</h2>
    <form action='/signupSubmit' method='POST'>
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

/*
TODO
Validate inputs
*/
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
  `;
  res.send(html);
});

app.get('/members', (req,res) => {
  if (!req.session.authenticated) {
    res.redirect('/');
  }
  username = req.session.username;
  var html = `
    <h2> Hello, ${username}! </h2>
    <h2>Welcome to the Members Area!</h2>
    <a href="/"><button>Return Home</button></a>
    <br>
    <a href="/logout"><button>Log Out</button></a>
  `;
  res.send(html);
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
  <a href="/logout"><button>Log Out</button></a>
  `;
  res.send(html);
});

app.get('/logout', (req,res) => {
	req.session.destroy();
  res.redirect('/');
});

app.use(express.static(__dirname + "/public"));

app.get("*", (req,res) => {
	res.status(404);
	res.send("Page not found - 404");
})

app.listen(port, () => {
	console.log("Node application listening on port " + port);
}); 


