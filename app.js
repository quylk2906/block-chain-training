import express from "express";
import bodyParser from "body-parser";
import chalk from "chalk";
import dotenv from "dotenv";
import logger from "morgan";
import expressValidator from "express-validator";
import expressStatusMonitor from "express-status-monitor";
import indexRouter from "./server/routes/index";

dotenv.load({ path: "config.env" });
// const port = process.env.PORT || 5000;
const port = process.argv[2];
const app = express();

app.use(expressStatusMonitor());
app.use(logger("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressValidator());

app.use("/blocks", indexRouter());
app.get("/", function(req, res) {
  res.send("Welcome to Blockchain");
});

app.listen(port, function() {
  console.log(chalk.green("Running server on port " + port));
});
