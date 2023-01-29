import { serve } from "https://deno.land/std@0.175.0/http/server.ts";
import { Relay } from "./Relay.ts";

const relay = Relay.instance;

const handler = async (req: Request) => {
  const url = new URL(req.url);
  const headers = new Headers();
  headers.set("Access-Control-Allow-Origin", "*");
  switch (req.method) {
    case "GET": {
      const id = decodeURIComponent(url.searchParams.get("id") || "");
      if (!id) {
        return new Response("Unauthorized", { status: 401, headers });
      }
      const { socket, response } = Deno.upgradeWebSocket(req);
      socket.onopen = () => relay.add(id, socket);
      socket.onclose = () => relay.remove(socket);
      return response;
    }
    case "POST": {
      const id = decodeURIComponent(url.searchParams.get("id") || "");
      if (!id) {
        return new Response("No destination", { status: 400, headers });
      }
      const message = await req.text();
      relay.send(id, message);
      return new Response("Message sent", { status: 200, headers });
    }
    case "OPTIONS": {
      headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      headers.set("Access-Control-Allow-Headers", "Content-Type");
      headers.set("Access-Control-Max-Age", "36000");
      return new Response(undefined, { status: 200, headers });
    }
    default:
      headers.set("Allow", "GET, POST, OPTIONS");
      return new Response("Method Not Allowed", { status: 405, headers });
  }
};

console.log(`Process started with pid ${Deno.pid}.`);
const ab = new AbortController();
serve(handler, { signal: ab.signal });

Deno.addSignalListener("SIGINT", () => {
  console.log("Closing relay...");
  ab.abort();
  relay.close();
  console.log("Done.");
});
