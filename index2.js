const express = require("express");
const app = express();

let requestCounter = 0;

//THis middleware is actually counts the total request hit on the server
app.use((req, res, next) => {
  requestCounter = requestCounter + 1;
  next();
});

app.get("/req1", (req, res) => {
  res.send("req 1 sended!");
});

app.get("/req2", (req, res) => {
  res.send("req 2 sended!");
});

app.get("/req3", (req, res) => {
  res.send("req 3 sended!");
});
