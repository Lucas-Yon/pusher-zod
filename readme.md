# Pusher-Zod

Pusher-Zod is a TypeScript package designed to enhance type safety for both server and client implementations when using Pusher (or Soketi). By integrating the powerful Zod library for runtime type validation, Pusher-Zod ensures that your Pusher event data adheres to the expected types, reducing the risk of runtime errors and providing a more robust development experience.

## Installation

To install Pusher-Zod, use your package manager of choice:

```bash
npm install pusher-zod zod
# or
yarn add pusher-zod zod
# or
pnpm instal pusher-zod zod
```

## Ressources

- [Pusher](https://pusher.com/)
- [Zod](https://zod.dev)
- [Soketi](https://soketi.app/)

## Usage

### First create a setup object that defines your Pusher channels and events with Zod schemas:

```typescript
import pusherZod from "pusher-zod";
import { z } from "zod";
const setup = {
  chat: {
    message: z.object({
      user: z.string(),
      text: z.string(),
    }),
    messageDeleted: z.object({
      user: z.string(),
      messageId: z.string(),
    }),
  },
  // Add more channels and events as needed
};

// Define if you need the users events ** optional **

const userEvents = {
  typing: z.object({
    user: z.string(),
  }),
  notification: z.object({
    user: z.string(),
    text: z.string(),
  }),
  booleanEvents: z.boolean(),
  numberEvents: z.number(),
  // Add more events as needed
};

// Export the client and server and import them where you need them
export const { TypeSafePusherClient, TypeSafePusherServer } = pusherZod({
  setup,
  userEvents, // optional
  channel_id_separator: "_", // optional choose your own separator a channel will be call chat_conversationID for example
});
```

### Then create a Pusher client instance using the TypeSafePusherClient class. See the PusherJS [docs](https://pusher.com/docs/channels) for more information

```typescript
import { TypeSafePusherClient } from "./pusher-zod-setup";

// For the options check the pusher-js docs
const Client = new TypeSafePusherClient({
    "app_key", // your app key
    // ...your options
})

// Subscribe to a channel. You will get an error if you try to join a channel that is not defined. The ID can be any value you want.
const channel = Client.joinChannel("chat", "conversationID");

// listen to an event
channel.listen("message", (data) => {
  // data is parsed and validated using safeParse from Zod
  if(!data.success) return console.log("error");

  // data is now typed and safe
  console.log(data.user, data.text);
});

```

### Then create a Pusher server instance using the TypeSafePusherServer class:

```typescript
import { TypeSafePusherServer } from "./pusher-zod-setup";

// For the options check the pusher-js docs
const pusherServer = new TypeSafePusherServer({
  appId: "YOUR_PUSHER_APP_ID",
  key: "YOUR_PUSHER_KEY",
  secret: "YOUR_PUSHER_SECRET",
  cluster: "YOUR_PUSHER_CLUSTER",
});

//  Use the invoke method for a type-safe way to trigger events

await pusherServer.invoke("channelName", "channelID", "event", {
  user: "user",
  text: "text",
});

// example:

await pusherServer.invoke("chat", "conversation1", "message", {
  user: "user",
  text: "text",
});

// Invoke like trigger also support multiple channels but instead you need to pass multiple channel ids

await pusherServer.invoke("chat", ["conversation1","conversation2","conversation3"], "message", {
  user: "user",
  text: "te
// sendToUser method is also now typesafe

await pusherServer.sendToUser(
  "userID",
  "event",
  "data matching the event schema"
);

// example:

await pusherServer.sendToUser("1", "typing", {
  user: "random username",
});
```

## Features

- Type-Safe Event Data: Ensure that event data sent and received through Pusher adheres to predefined TypeScript types.
- Server and Client Integration: Apply type safety both on the server and client sides for a seamless end-to-end development experience.
- Zod Integration: Leverage the Zod library for runtime type validation, making it easy to define and enforce data schemas.

## Roadmap

- [x] Type-safe event data
- [x] Server and client integration
- [x] Zod integration
- [ ] Support for presence channels
- [ ] Support for private channels
- [ ] Add choice between safeParse and parse
- [ ] Type-safe user data
- [ ] Retrieve existing private channels and presence channels names on the server side
- [ ] Add tests

## Contributing

Feel free to contribute to Pusher-Zod by opening issues or pull requests on the GitHub repository.

## License

Pusher-Zod is licensed under the [MIT License](LICENSE).
