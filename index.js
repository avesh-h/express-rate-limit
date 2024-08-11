const express = require("express");
const app = express();

let numberOfTheRequest = {};

setInterval(() => {
  numberOfTheRequest = {};
}, 1000);

//rate-limitter global middleware
app.use((req, res, next) => {
  const userId = req.headers["user-id"];
  if (numberOfTheRequest[userId]) {
    numberOfTheRequest[userId] = numberOfTheRequest[userId] + 1;
    if (numberOfTheRequest[userId] > 5) {
      res.status(400).send("No more request!");
    } else {
      next();
    }
  } else {
    numberOfTheRequest[userId] = 1;
    next();
  }
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
