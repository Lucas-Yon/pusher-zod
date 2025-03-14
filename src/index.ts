/* eslint-disable @typescript-eslint/no-explicit-any */
import PusherClient, { type Channel as PusherChannel } from "pusher-js";
import PusherServer from "pusher";

import type { z, ZodType, SafeParseReturnType, ParseReturnType } from "zod";
export default function <
  S extends Record<string, Record<string, z.ZodType<any, any>>>,
  P extends Partial<Record<string, z.ZodType<any, any>>> = Record<string, never>
>({
  setup,
  channel_id_separator = ".",
  userEvents = {} as P,
}: {
  setup: S;
  channel_id_separator?: "_" | "-" | "=" | "@" | "," | "." | ";";
  userEvents?: P;
}) {
  type ChannelsNames = keyof S;
  type EventKeys<K extends ChannelsNames> = {
    [P in keyof (typeof setup)[K]]: (typeof setup)[K][P] extends ZodType<
      any,
      any
    >
      ? P
      : never;
  }[keyof (typeof setup)[K]];

  type MyChannel<K extends ChannelsNames> = {
    bind<E extends EventKeys<K>>(
      eventName: E,
      callback: (data: z.infer<S[K][E]>) => void,
      context?: any
    ): MyPusherClient;
    unbind<E extends EventKeys<K>>(
      eventName?: E,
      callback?: (data: S[K][E]) => void,
      context?: any
    ): MyPusherClient;
    listen<E extends EventKeys<K>>(
      eventName: E,
      callback: (data: z.infer<S[K][E]>) => void,
      context?: any
    ): void;
  } & PusherChannel;

  type MyPusherClient = Omit<PusherClient, "getClientFeatures"> & {
    joinChannel<K extends ChannelsNames>(
      channelName: K,
      id: string | number
    ): MyChannel<K>;
    leaveChannel<K extends ChannelsNames>(
      channelName: K,
      id: string | number
    ): void;
    member: {
      bind: <E extends Extract<keyof P, string>>(
        eventName: E,
        callback: (data: z.infer<NonNullable<P[E]>>) => void,
        context?: any
      ) => any;
    };
  };

  class TypeSafePusherClient extends PusherClient implements MyPusherClient {
    public member;

    constructor(...args: ConstructorParameters<typeof PusherClient>) {
      super(...args);
      this.member = {
        ...this.user,
        bind: <E extends keyof P>(
          eventName: E,
          callback: (data: z.infer<NonNullable<P[E]>>) => void,
          context?: any
        ) => {
          const parsedCallback = (data: P[typeof eventName]) => {
            const parsedData = parseData(userEvents[eventName]!, data);
            if (parsedData !== undefined) callback(parsedData);
          };
          return this.user.bind(String(eventName), parsedCallback, context);
        },
      };
    }

    joinChannel<K extends ChannelsNames>(
      channelName: K,
      id: string | number
    ): MyChannel<K> {
      const channel = super.subscribe(
        `${String(channelName)}${channel_id_separator}${id}`
      ) as MyChannel<K>;
      channel.listen = (eventName, callback, context) => {
        const parsedCallback = (data: z.infer<S[K][typeof eventName]>) => {
          const parsedData = parseData(setup[channelName][eventName], data);
          if (parsedData !== undefined)
            callback(parseData(setup[channelName]![eventName]!, data));
        };
        channel.bind(eventName, parsedCallback, context);
      };
      return channel;
    }
    /** same logic as joinChannel  */
    leaveChannel<K extends ChannelsNames>(
      channelName: K,
      id: string | number
    ): void {
      super.unsubscribe(`${String(channelName)}${channel_id_separator}${id}`);
    }
  }

  type MyPusherServer = PusherServer & {
    trigger<K extends ChannelsNames, E extends EventKeys<K>>(
      channelName: K,
      eventName: E,
      data: S[K][E]
    ): void;
  };

  class TypeSafePusherServer extends PusherServer implements MyPusherServer {
    invoke<K extends ChannelsNames, E extends EventKeys<K>>(
      channelName: K,
      channel_id: string | number | Array<string | number>,
      eventName: E,
      data: z.infer<(typeof setup)[K][E]>
    ) {
      if (Array.isArray(channel_id)) {
        const channels = channel_id.map((id) => {
          return `${String(channelName)}${channel_id_separator}${id}`;
        });
        return super.trigger(channels, String(eventName), data);
      }
      return super.trigger(
        `${String(channelName)}${channel_id_separator}${channel_id}`,
        String(eventName),
        data
      );
    }
    invokeBatch<K extends ChannelsNames, E extends EventKeys<K>>(
      batch: Array<{
        channel: K;
        channel_id: string | number;
        name: E;
        data: z.infer<(typeof setup)[K][E]>;
        socket_id?: string;
        info?: any;
      }>
    ) {
      return super.triggerBatch(
        batch.map((b) => {
          return {
            channel: `${String(b.channel)}${channel_id_separator}${
              b.channel_id
            }`,
            name: String(b.name),
            data: b.data,
            socket_id: b.socket_id,
            info: b.info,
          };
        })
      );
    }
    override sendToUser<E extends keyof P>(
      userId: string,
      event: Extract<E, string>,
      data: z.infer<Exclude<P[E], undefined>>
    ): Promise<PusherServer.Response> {
      return super.sendToUser(userId, event, data);
    }
    getChannels<K extends ChannelsNames>(): Array<K> {
      return Object.keys(setup) as Array<K>;
    }
    getPrivateChannels<K extends ChannelsNames>(): Array<
      Extract<K, `private-${string}`>
    > {
      const channels = Object.keys(setup) as Array<K>;
      return channels.filter(this.isPrivateChannel);
    }

    getPresenceChannels<K extends ChannelsNames>(): Array<
      Extract<K, `presence-${string}`>
    > {
      const channels = Object.keys(setup) as Array<K>;
      return channels.filter(this.isPresenceChannel);
    }

    private isPrivateChannel<K extends ChannelsNames>(
      channel: K
    ): channel is Extract<K, `private-${string}`> {
      if (typeof channel !== "string") return false;
      return channel.startsWith("private-");
    }

    private isPresenceChannel<K extends ChannelsNames>(
      channel: K
    ): channel is Extract<K, `presence-${string}`> {
      if (typeof channel !== "string") return false;
      return channel.startsWith("presence-");
    }
  }
  function parseData<K>(
    zodSchema: z.ZodType<any, any>,
    data: K
  ): K | undefined {
    try {
      return zodSchema.parse(data);
    } catch (error) {
      console.error(error);
      return undefined;
    }
  }

  return {
    TypeSafePusherClient,
    TypeSafePusherServer,
  };
}
