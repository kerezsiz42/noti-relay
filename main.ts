import { serve } from "https://deno.land/std@0.171.0/http/server.ts";
import { Relay } from "./Relay.ts";

const relay = Relay.instance;

const handler = async (req: Request) => {
  const url = new URL(req.url);
  const id = decodeURIComponent(url.searchParams.get("id") || "");
  if (id === "") {
    return new Response("Unathorized", {
      status: 401,
    });
  }
  if (req.method === "POST") {
    const message = await req.text();
    if (id === "") {
      return new Response("No destination", {
        status: 400,
      });
    }
    relay.send(id, message);
    return new Response("Message sent", { status: 200 });
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
