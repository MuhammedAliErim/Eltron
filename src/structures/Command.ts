import { ChatInputCommandInteraction, SlashCommandBuilder, SlashCommandSubcommandsOnlyBuilder, AutocompleteInteraction, PermissionResolvable } from 'discord.js';
import { EltronClient } from './EltronClient';

export interface CommandExecuteOptions {
  client: EltronClient;
  interaction: ChatInputCommandInteraction;
}

export interface CommandAutocompleteOptions {
  client: EltronClient;
  interaction: AutocompleteInteraction;
}

export abstract class Command {
  /**
   * The Discord.js SlashCommandBuilder used to register the command
   */
  abstract data: Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'> | SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder | ReturnType<SlashCommandBuilder['addUserOption']> | ReturnType<SlashCommandBuilder['addStringOption']> | ReturnType<SlashCommandBuilder['addIntegerOption']> | ReturnType<SlashCommandBuilder['addBooleanOption']>;

  /**
   * Cooldown in seconds before the user can run this command again
   */
  public cooldown?: number;

  /**
   * Required discord permissions to run this command
   */
  public requiredPermissions?: PermissionResolvable[];

  /**
   * Is this command strictly for the bot developer?
   */
  public developerOnly?: boolean;

  /**
   * The main execution function for the command
   */
  abstract execute(options: CommandExecuteOptions): Promise<void> | void;

  /**
   * Optional autocomplete handler for the command
   */
  public autocomplete?(options: CommandAutocompleteOptions): Promise<void> | void;
}
