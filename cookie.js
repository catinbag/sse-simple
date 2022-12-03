function parseCookie(str) {
  return str
    .split(";")
    .map((v) => v.split("="))
    .reduce((acc, val) => {
      const [key, value] = val;

      acc[decodeURIComponent(key.trim())] = decodeURIComponent(value.trim());

      return acc;
    }, {});
}

module.exports = {
  parseCookie,
};
