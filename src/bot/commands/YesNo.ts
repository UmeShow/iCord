import { Client, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "./Command";

export const YesNo: Command = {
    data: new SlashCommandBuilder()
        .setName("yesno")
        .setDescription("究極の二択、イエスかノーかで答えてやるよ")
        .addStringOption(option => 
            option.setName("question")
                .setDescription("悩める子羊の質問をどうぞ")
                .setRequired(true)
        ),
    execute: async (client: Client, interaction: ChatInputCommandInteraction) => {
        const question = interaction.options.getString("question");
        
        const answer = Math.random() < 0.5 ? "Yes!（そりゃもう！）" : "No...（やめといたほうがいいね）";
        await interaction.reply(`🤔 質問: ${question}\n🔮 神の啓示: **${answer}**`);
    }
};
