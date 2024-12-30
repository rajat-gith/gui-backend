const https = require("https");
const fs = require("fs");
const app = require("./app");

const HTTPS_PORT = process.env.HTTPS_PORT || 443;

const options = {
  key: fs.readFileSync("private.key"), 
  cert: fs.readFileSync("certificate.crt"), 
  ca: fs.readFileSync("ca_bundle.crt")
};

https.createServer(options, app).listen(HTTPS_PORT, () => {
  console.log(`HTTPS Server running on port ${HTTPS_PORT}`);
});
