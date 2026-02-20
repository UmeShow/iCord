import { Client, ChatInputCommandInteraction, SlashCommandBuilder, Message, TextChannel } from "discord.js";
import { Command } from "./Command";
import { generateResponse } from "../../ai/gemini";

export const Shiritori: Command = {
    data: new SlashCommandBuilder()
        .setName("shiritori")
        .setDescription("AIとしりとり対決！負けないからね！"),
    execute: async (client: Client, interaction: ChatInputCommandInteraction) => {
        // テキストチャンネル以外（DMなど）ではスレッドが作れない場合があるためチェック
        if (!interaction.guild || !(interaction.channel instanceof TextChannel)) {
            await interaction.reply({ content: "ごめんね、このコマンドはサーバーのテキストチャンネルでしか使えないんだ。（スレッドを作りたいからね！）", ephemeral: true });
            return;
        }

        const startMsg = await interaction.reply({ 
            content: "よし、しりとりだね！スレッドを作るからそっちでやろう！他の人の邪魔にならないようにね。",
            fetchReply: true // startThreadを使うにはMessageオブジェクトが必要なため、ここではfetchReplyを使用するか、返り値をMessageとして扱う必要があります
        });

        // スレッドを作成
        // startMsgの型がInteractionResponseの場合、startThreadがない等のエラーが出る可能性があるため
        // メッセージオブジェクトとして扱うか、チャンネルからスレッドを作る
        const thread = await interaction.channel.threads.create({
            name: `しりとり会場 🆚 ${interaction.user.displayName}`,
            autoArchiveDuration: 60,
            reason: 'Shiritori game thread',
            startMessage: startMsg.id
        });

        await thread.send("準備完了！ここなら誰にも邪魔されないよ。\n**ルール**: 日本語で答えてね。最後に「ん」がついたら負けだよ！\n(終わる時は `exit` って打ってね)\n\n先攻は君からどうぞ！");

        // スレッド内のメッセージを監視
        const collector = thread.createMessageCollector({
            filter: (m: Message) => m.author.id === interaction.user.id && !m.author.bot,
            time: 1000 * 60 * 10 // 10分でタイムアウト
        });

        let history: { role: 'user' | 'model'; parts: string }[] = [];
        let isProcessing = false; // AI考え中フラグ

        const systemInstruction = `
あなたはしりとりの対戦相手です。
ルール:
1. ユーザー入力に対して、その単語の最後の文字から始まる単語を返してください。
2. 単語は日本語（ひらがな、カタカナ、漢字）で返してください。
3. 相手の単語が「ん」で終わっていたら、あなたの勝ちです。「ん」で終わりましたね！私の勝ちです！と言ってください。
4. あなたが返す単語が「ん」で終わってしまったら、あなたの負けです。
5. 前に使った単語は使いません。
6. 返答は単語のみ、または勝敗の判定のみにしてください。
`;

        collector.on('collect', async (m: Message) => {
            if (m.content.toLowerCase() === 'exit') {
                collector.stop();
                await thread.send("対戦ありがとうございました！また遊んでね👋");
                await thread.setArchived(true); // スレッドを閉じる
                return;
            }

            if (isProcessing) {
                // 考え中に連投された場合
                await m.reply("ちょっと待って！まだ考えてる途中だよ💦");
                return;
            }

            isProcessing = true;
            await thread.sendTyping(); // 入力中...を表示

            try {
                // Pass the conversation history to keep track of used words implicitly via context
                const response = await generateResponse(m.content, history, systemInstruction);
                
                // Add to history
                history.push({ role: 'user', parts: m.content });
                history.push({ role: 'model', parts: response });
                
                await thread.send(response);
                
                if (response.includes("勝ち") || response.includes("負け")) {
                    collector.stop();
                    setTimeout(() => thread.setArchived(true), 5000);
                }

            } catch (error) {
                console.error(error);
                await thread.send("おっと、脳みそがショートしたみたい... (エラーが発生しました)");
            } finally {
                isProcessing = false;
            }
        });
        
        collector.on('end', async (_: unknown, reason: string) => {
            if (reason === 'time') {
                await thread.send("長考しすぎ〜！時間切れで私の勝ちってことでいいかな？（タイムアウト）");
                await thread.setArchived(true);
            }
        });
    }
};
