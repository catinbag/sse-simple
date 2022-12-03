const http2 = require("http2");
const {
  HTTP2_HEADER_SCHEME,
  HTTP2_HEADER_PATH,
  HTTP2_HEADER_AUTHORITY,
  HTTP_STATUS_OK,
  HTTP_STATUS_SEE_OTHER,
} = http2.constants;
const { readFileSync, createReadStream } = require("fs");
const { join } = require("path");
const EventEmitter = require("events").EventEmitter;
const { parseCookie } = require("./utils");

let data;

class SSE extends EventEmitter {
  constructor() {
    super();
  }

  streamsCount = 0;

  init(stream, headers) {
    stream.respond({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    });

    const cookie = headers.cookie ? parseCookie(headers.cookie) : {};

    let id = 0;

    function dataListener(listenerData) {
      if (listenerData.event !== undefined) {
        stream.write(`event: ${listenerData.event}\n`);
      }

      stream.write(
        `data: user ${cookie.name ?? "no-user"} ${listenerData.data}\n`
      );
      stream.write(`id: ${id++}\n`);
      stream.write(`\n`);
    }

    this.on("data", dataListener);

    stream.on("close", () => {
      this.removeListener("data", dataListener);
      this.streamsCount--;
    });

    this.streamsCount++;
    console.log(`streams count: ${this.streamsCount}`);
  }

  send(sendData) {
    this.emit("data", sendData);
  }
}

const sse = new SSE();

const ROUTES = {
  main: "/",
  sse: "/stream",
  login: "/login",
  message: "/send-msg",
};

const server = http2.createSecureServer({
  key: readFileSync("localhost-privkey.pem"),
  cert: readFileSync("localhost-cert.pem"),
});

function onStream(stream, headers) {
  const scheme = headers[HTTP2_HEADER_SCHEME];
  const authority = headers[HTTP2_HEADER_AUTHORITY];
  const urlPath = headers[HTTP2_HEADER_PATH];

  const url = new URL(`${scheme}://${authority}${urlPath}`);

  if (url.pathname === ROUTES.sse) {
    sse.init(stream, headers);

    return;
  }

  if (url.pathname === ROUTES.login) {
    const name = url.searchParams.get("name");
    stream.respond({
      "set-cookie": `name=${name}`,
      ":status": HTTP_STATUS_SEE_OTHER,
      location: ROUTES.main,
    });

    return;
  }

  if (url.pathname === ROUTES.message) {
    data = url.searchParams.get("message");
    sse.send({ data });
    stream.respond({
      ":status": HTTP_STATUS_OK,
    });
    stream.end("ok");

    return;
  }

  const filePath = join(__dirname, "index.html");

  const fileStream = createReadStream(filePath);
  fileStream.pipe(stream);
}

const PORT = 8080;

server.on("stream", onStream).listen(PORT, () => {
  console.log(`server started at port ${PORT}`);
});
