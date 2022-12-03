const http2 = require("http2");
const {
  HTTP2_HEADER_SCHEME,
  HTTP2_HEADER_PATH,
  HTTP2_HEADER_AUTHORITY,
  HTTP_STATUS_OK,
} = http2.constants;
const fs = require("fs");
const path = require("path");
const EventEmitter = require("events").EventEmitter;

const PORT = 8080;

const sseRoute = "/stream";

let data;
let streamsCount = 0;

const parseCookie = (str) =>
  str
    .split(";")
    .map((v) => v.split("="))
    .reduce((acc, v) => {
      acc[decodeURIComponent(v[0].trim())] = decodeURIComponent(v[1].trim());
      return acc;
    }, {});

class SSE extends EventEmitter {
  constructor() {
    super();
  }

  init(stream, headers) {
    stream.respond({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    });

    console.log("headers", headers);

    const cookie = headers.cookie ? parseCookie(headers.cookie) : {};

    let id = 0;

    function dataListener(data) {
      if (data.event !== undefined) {
        stream.write(`event: ${data.event}\n`);
      }

      stream.write(`data: user ${cookie.name ?? "no-user"} ${data.data}\n`);
      stream.write(`id: ${id++}\n`);
      stream.write(`\n`);
    }

    this.on("data", dataListener);

    stream.on("close", () => {
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

const server = http2.createSecureServer({
  key: fs.readFileSync("localhost-privkey.pem"),
  cert: fs.readFileSync("localhost-cert.pem"),
});

server
  .on("stream", (stream, headers) => {
    const scheme = headers[HTTP2_HEADER_SCHEME];
    const authority = headers[HTTP2_HEADER_AUTHORITY];
    const urlPath = headers[HTTP2_HEADER_PATH];

    const url = new URL(`${scheme}://${authority}${urlPath}`);

    if (url.pathname === sseRoute) {
      sse.init(stream, headers);

      return;
    }

    if (url.pathname === "/login") {
      const name = url.searchParams.get("name");
      stream.respond({
        "set-cookie": `name=${name}`,
        ":status": "303",
        location: "/",
      });

      return;
    }

    if (url.pathname === "/send-msg") {
      data = url.searchParams.get("message");
      sse.send({ data });
      stream.respond({
        ":status": HTTP_STATUS_OK,
      });
      stream.end("ok");

      return;
    }

    const filePath = path.join(__dirname, "index.html");

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(stream);
  })
  .listen(PORT, () => {
    console.log(`server started at port ${PORT}`);
  });
