function generateCode(length = 6) {
  // numeric code
  let s = "";
  for (let i = 0; i < length; i++) {
    s += Math.floor(Math.random() * 10);
  }
  return s;
}

module.exports = { generateCode };
