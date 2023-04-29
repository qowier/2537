const express = require('express');

const port = process.env.PORT || 3000;

const app = express();

app.get('/about', (req,res) => {
  var color = req.query.color;
  res.send("<h1 style='color:" + color + ";'>Hello!</h1>");
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

app.use(express.static(__dirname + "/public"));

app.get("*", (req,res) => {
	res.status(404);
	res.send("Page not found - 404");
})

app.listen(port, () => {
	console.log("Node application listening on port " + port);
}); 
  