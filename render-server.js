import http from "node:http";
import worker from "./index.js";

const PORT = Number(process.env.PORT || 3000);
const HOST = "0.0.0.0";

const server = http.createServer(async (req, res) => {
  try {
    const host = req.headers.host || `localhost:${PORT}`;
    const protocol = req.headers["x-forwarded-proto"] || "http";
    const url = `${protocol}://${host}${req.url}`;

    const headers = new Headers();

    for (const [key, value] of Object.entries(req.headers)) {
      if (value === undefined) continue;

      if (Array.isArray(value)) {
        for (const v of value) headers.append(key, v);
      } else {
        headers.set(key, value);
      }
    }

    let body;

    if (req.method !== "GET" && req.method !== "HEAD") {
      body = req;
    }

    const request = new Request(url, {
      method: req.method,
      headers,
      body,
      duplex: body ? "half" : undefined
    });

    const response = await worker.fetch(request, {}, {});

    res.statusCode = response.status;

    for (const [key, value] of response.headers) {
      res.setHeader(key, value);
    }

    if (!response.body) {
      res.end();
      return;
    }

    const reader = response.body.getReader();

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      res.write(Buffer.from(value));
    }

    res.end();

  } catch (error) {
    console.error("Server error:", error);

    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain");
    res.end("Internal Server Error");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
