import { serve } from "https://deno.land/std@0.175.0/http/server.ts";
import { Relay } from "./Relay.ts";

const relay = Relay.instance;

const handler = async (req: Request) => {
  const url = new URL(req.url);
  const headers = new Headers();
  headers.set("Access-Control-Allow-Origin", "*");
  const id = decodeURIComponent(url.searchParams.get("id") || "");
  if (id === "") {
    return new Response("Unathorized", {
      status: 401,
      headers,
    });
  }
  if (req.method === "POST") {
    const message = await req.text();
    if (id === "") {
      return new Response("No destination", {
        status: 400,
        headers,
      });
    }
    relay.send(id, message);
    return new Response("Message sent", { status: 200, headers });
  }
  const { socket, response } = Deno.upgradeWebSocket(req);
  socket.onopen = () => {
    relay.add(id, socket);
    setTimeout(() => {
      socket.close();
    }, 60_000);
  };
  socket.onclose = () => {
    relay.remove(socket);
  };
  return response;
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
