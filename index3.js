const express = require("express");
const app = express();

let numberOfErrorClientGet = 0;

app.get("/req1", (req, res) => {
  res.send("req 1 sended!");
});

app.get("/req2", (req, res) => {
  res.send("req 2 sended!");
});

app.get("/req3", (req, res) => {
  res.send("req 3 sended!");
});

//error-count global middleware
app.use((err, req, res, next) => {
  numberOfErrorClientGet = numberOfErrorClientGet + 1;
  console.log("count", numberOfErrorClientGet);
  res.status(404).send("error!");
});

app.listen(3001);
