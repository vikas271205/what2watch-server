// encode.js
const fs = require("fs");

const json = fs.readFileSync("./serviceAccount.json", "utf8");
const encoded = Buffer.from(json).toString("base64");

console.log(encoded);
