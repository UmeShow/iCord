import { Client, ChatInputCommandInteraction, SlashCommandBuilder, SlashCommandOptionsOnlyBuilder } from 'discord.js';

export interface Command {
    data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
    execute: (client: Client, interaction: ChatInputCommandInteraction) => Promise<void>;
}
