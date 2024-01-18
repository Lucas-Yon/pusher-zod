import test from "./src/index";
import z from "zod";

const { TypeSafePusherClient } = test({
  setup: {
    kappa: {
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
