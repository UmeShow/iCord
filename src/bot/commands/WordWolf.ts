import { Client, EmbedBuilder, TextChannel, ChatInputCommandInteraction, Message, SlashCommandBuilder } from "discord.js";
import { Command } from "./Command";

export const WordWolf: Command = {
    data: new SlashCommandBuilder()
        .setName("wordwolf")
        .setDescription("ワードウルフ（3人以上専用）"),
    execute: async (client: Client, interaction: ChatInputCommandInteraction) => {
        if (!interaction.guild || !(interaction.channel instanceof TextChannel)) {
            await interaction.reply({ content: "ここはサーバーのテキストチャンネルじゃないみたいだね...。出直してきて！", ephemeral: true });
            return;
        }
        const channel = interaction.channel; // Capture narrowed channel

        const embed = new EmbedBuilder()
            .setTitle("🐺 ワードウルフ")
            .setDescription("🐺 リアクションを押して参加してね！（最低3人は必要だよ）\nホストは準備ができたら `start` と入力してゲームを始めてね。")
            .setColor("#5865F2");

        await interaction.reply({ embeds: [embed] });
        const lobbyMsg = await interaction.fetchReply();
        await lobbyMsg.react("🐺");

        const players = new Set<string>();
        players.add(interaction.user.id); // Host auto-joins

        const collector = lobbyMsg.createReactionCollector({
            filter: (r, u) => r.emoji.name === "🐺" && !u.bot,
            time: 60000
        });

        collector.on('collect', (r, u) => {
            players.add(u.id);
        });
        
        // Listen for start command from host
        const startFilter = (m: Message) => m.author.id === interaction.user.id && m.content === 'start';
        const startCollector = channel.createMessageCollector({ filter: startFilter, time: 60000, max: 1 });

        startCollector.on('collect', async () => {
             collector.stop("started");
             if (players.size < 3) {
                 await channel.send("人が足りません！最低でも3人は集めてきて！");
                 return;
             }
             
             // Game Logic
             // 1. Pick words (Major / Minor)
             const wordPairs = [
                 ["りんご", "なし"],
                 ["犬", "猫"],
                 ["車", "自転車"],
                 ["ご飯", "パン"],
                 ["Discord", "Slack"],
                 ["YouTube", "Twitch"],
                 ["きのこ", "たけのこ"],
                 ["コーヒー", "紅茶"]
             ];
             const pair = wordPairs[Math.floor(Math.random() * wordPairs.length)]!;
             const isSwapped = Math.random() < 0.5;
             const majorWord = isSwapped ? pair[1] : pair[0];
             const minorWord = isSwapped ? pair[0] : pair[1];

             // 2. Assign Wolves (Minority)
             const playerArray = Array.from(players);
             const wolfIndex = Math.floor(Math.random() * playerArray.length);
             const wolfId = playerArray[wolfIndex];
             
             // 3. DM users
             const promises = playerArray.map(async (pid) => {
                 const user = await client.users.fetch(pid);
                 const word = pid === wolfId ? minorWord : majorWord;
                 try {
                    await user.send(`君のお題はコレ！👉 **${word}**\n正体を隠しながらチャットで探り合い開始！くれぐれもボロを出さないように...`);
                 } catch (e) {
                    await channel.send(`${user} にDM送れないよ！DM許可して出直してきて！`);
                 }
             });
             
             await Promise.all(promises);
             
             await channel.send(`ゲーム開始！さあ、騙し合いの時間の始まりだ...（制限時間は3分！）`);
             
             setTimeout(() => {
                 channel.send("終了ー！ゴホン、それでは喉の調子を整えて... 誰が「違う」お題を持っているか、投票の時間だ！");
                 // Voting logic omitted for brevity (just discussion phase implemented)
                 channel.send(`正解発表〜！\n裏切り者のウルフは <@${wolfId}> でした！（ウルフのお題: ${minorWord}）\nちなみに市民のお題はこれ: ${majorWord}`);
             }, 1000 * 60 * 3);
        });
    }
}
