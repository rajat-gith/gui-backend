const app = require("./app");

const HTTP_PORT = process.env.PORT || 80;

app.listen(HTTP_PORT, () => {
  console.log(`Server running on port ${HTTP_PORT}`);
});
