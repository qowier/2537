const express = require('express');

const port = process.env.PORT || 3000;

const app = express();

app.use(express.urlencoded({extended: false}));

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
    res.send("<img src='/rick_roll.gif' style='width:500px;'>");
  }
  else if (gif == 2) {
    res.send("<img src='/eat_popcorn.gif' style='width:500px;'>");
  }
  else if (gif == 3) {
    res.send("<img src='/shake.gif' style='width:500px;'>");
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

app.use(express.static(__dirname + "/public"));

app.get("*", (req,res) => {
	res.status(404);
	res.send("Page not found - 404");
})

app.listen(port, () => {
	console.log("Node application listening on port " + port);
}); 
