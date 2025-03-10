import test from "./src"; //"./src/index";
import z from "zod";

const { TypeSafePusherClient, TypeSafePusherServer } = test({
  setup: {
    kappa: {
      event: z.object({
        id: z.string(),
        name: z.string(),
        age: z.number(),
      }),
    },
    "private-yolo": {
      event: z.object({
        id: z.string(),
        name: z.string(),
        age: z.number(),
      }),
    },
  },
});

const client = new TypeSafePusherClient("key", {
  cluster: "eu",
});

client.joinChannel("kappa", "123").listen("event", (data) => {
  console.log(data.name);
});

//client.user.watchlist.

const server = new TypeSafePusherServer({
  appId: "123",
  cluster: "eu",
  secret: "123",
  key: "123",
});

const channels = server.getChannels();
const private_channels = server.getPrivateChannels();
