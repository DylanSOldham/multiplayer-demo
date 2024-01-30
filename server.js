// Express setup adapted from https://expressjs.com/en/starter/hello-world.html
const express = require("express");
const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.static("./public")); //https://expressjs.com/en/starter/static-files.html

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});