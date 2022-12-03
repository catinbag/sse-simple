const http = require("http");
const fs = require("fs");
const path = require("path");
const EventEmitter = require("events").EventEmitter;

const PORT = 8080;

const sseRoute = "/stream";

let data;
let streamsCount = 0;

class SSE extends EventEmitter {
  constructor() {
    super();
  }

  init(req, res) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    this.req = req;
    this.res = res;

    let id = 0;

    function dataListener(data) {
      console.log("data l", data);
      if (data.event !== undefined) {
        res.write(`event: ${data.event}\n`);
      }

      this.res.write(`data: ${data.data}\n`);
      this.res.write(`id: ${id++}\n`);
      this.res.write(`\n`);
    }

    this.on("data", dataListener);

    req.on("close", () => {
      this.removeListener("data", dataListener);
      streamsCount--;
    });

    streamsCount++;
    console.log(`streams count: ${streamsCount}`);
  }

  send(data) {
    console.log("send", data);
    this.emit("data", data);
  }
}

const sse = new SSE();

http
  .createServer((req, res) => {
    const url = new URL(`http://${req.headers.host}${req.url}`);

    if (url.pathname === sseRoute) {
      sse.init(req, res);

      return;
    }

    if (url.pathname === "/send-msg") {
      data = url.searchParams.get("message");
      sse.send({ data });
      res.end("ok");

      return;
    }

    const filePath = path.join(__dirname, "index.html");

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  })
  .listen(PORT, () => {
    console.log(`server started at port ${PORT}`);
  });
