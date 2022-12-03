function parseCookie(str) {
  str
    .split(";")
    .map((v) => v.split("="))
    .reduce((acc, v) => {
      const [key, value] = v;
      acc[decodeURIComponent(key.trim())] = decodeURIComponent(value.trim());
      return acc;
    }, {});
}

module.exports = {
  parseCookie,
};
