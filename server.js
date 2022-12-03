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
const { SSE } = require("./sse");

const sse = new SSE();

const server = http2.createSecureServer({
  key: readFileSync("localhost-privkey.pem"),
  cert: readFileSync("localhost-cert.pem"),
});

const ROUTES = {
  main: "/",
  sse: "/stream",
  login: "/login",
  message: "/send-msg",
};

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
    const data = url.searchParams.get("message");
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
