const EventEmitter = require("events");
const { parseCookie } = require("./cookie");

function createRow(content) {
  return `${content}\n`;
}

function createDataRow(data) {
  return createRow(`data: ${data}`);
}

function createIdRow(id) {
  return createRow(`id: ${id}`);
}

function createEventRow(event) {
  return createRow(`event: ${event}`);
}

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

    let id = 0;

    const cookie =
      headers.cookie !== undefined ? parseCookie(headers.cookie) : {};

    function dataListener(listenerData) {
      if (listenerData.event !== undefined) {
        stream.write(createEventRow(listenerData.event));
      }

      console.log("listerner cookie", cookie);

      const localData = `user ${cookie.name ?? "no-user"} ${listenerData.data}`;
      console.log("localData", localData);
      stream.write(createDataRow(localData));
      stream.write(createIdRow(id++));
      stream.write(createRow());
    }

    this.on("data", dataListener);

    stream.on("close", () => {
      this.removeListener("data", dataListener);
      this.streamsCount--;
    });

    this.streamsCount++;
  }

  send(sendData) {
    this.emit("data", sendData);
  }
}

module.exports = {
  SSE,
};
