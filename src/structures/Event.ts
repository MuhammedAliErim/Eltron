import { ClientEvents } from 'discord.js';
import { EltronClient } from './EltronClient';

export abstract class Event<K extends keyof ClientEvents> {
  /**
   * The name of the event
   */
  abstract name: K;

  /**
   * Whether this event should only be triggered once
   */
  public once?: boolean = false;

  /**
   * The execution function for the event
   */
  abstract execute(client: EltronClient, ...args: ClientEvents[K]): Promise<void> | void;
}
