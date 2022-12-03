const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 8080;

const sseRoute = "/stream";

let data;

function sse(req, res) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let id = 0;

  const timer = setInterval(() => {
    if (data !== undefined && data !== "") {
      res.write(`data: ${data}\n`);
      res.write(`id: ${id++}\n`);
      res.write(`\n`);
    }
  }, 2_000);

  // setTimeout(() => {
  //   clearInterval(timer);
  //   res.write(`event: end-of-stream\n`);
  //   res.write(`data: end\n`);
  //   res.write(`\n`);

  //   res.end("ok");
  // }, 5_000);
}

http
  .createServer((req, res) => {
    const url = new URL(`http://${req.headers.host}${req.url}`);

    if (url.pathname === sseRoute) {
      sse(req, res);

      return;
    }

    if (url.pathname === "/send-msg") {
      data = url.searchParams.get("message");
      res.end(data);

      return;
    }

    const filePath = path.join(__dirname, "index.html");

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  })
  .listen(PORT, () => {
    console.log(`server started at port ${PORT}`);
  });
