import { Client, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, ButtonInteraction, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "./Command";

export const TicTacToe: Command = {
    data: new SlashCommandBuilder()
        .setName("tictactoe")
        .setDescription("Play Tic-Tac-Toe")
        .addUserOption(option => 
            option.setName("opponent")
                .setDescription("The user you want to play against")
                .setRequired(true)
        ),
    execute: async (client: Client, interaction: ChatInputCommandInteraction) => {
        const opponent = interaction.options.getUser("opponent");
        if (!opponent) {
            await interaction.reply({ content: "対戦相手が見つかりませんでした", ephemeral: true });
            return;
        }

        if (opponent.bot && opponent.id !== client.user?.id) {
             await interaction.reply({ content: "対戦相手はBotか他の人間のみ選べます。", ephemeral: true });
             return;
        }
        
        if (opponent.id === interaction.user.id) {
             await interaction.reply({ content: "自分自身とは対戦できません。BOTまたはほかのユーザーを選んでください！", ephemeral: true });
             return;
        }

        const board = [0, 0, 0, 0, 0, 0, 0, 0, 0]; // 0: empty, 1: X (author), 2: O (opponent)
        let turn = 1; // 1 or 2

        const getButtonRow = (rowIdx: number) => {
            const row = new ActionRowBuilder<ButtonBuilder>();
            for (let i = 0; i < 3; i++) {
                const idx = rowIdx * 3 + i;
                const val = board[idx];
                // Use a visible dash for empty to avoid validation errors, or a zero-width space if supported.
                // Using "-" is safe and visible.
                const label = val === 0 ? "-" : val === 1 ? "X" : "O";
                const style = val === 0 ? ButtonStyle.Secondary : val === 1 ? ButtonStyle.Primary : ButtonStyle.Danger;
                
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`ttt_${idx}`)
                        .setLabel(label)
                        .setStyle(style)
                        .setDisabled(val !== 0)
                );
            }
            return row;
        };

        const getComponents = () => [getButtonRow(0), getButtonRow(1), getButtonRow(2)];

        await interaction.reply({
            content: `Tic-Tac-Toe: ${interaction.user} (X) vs ${opponent} (O)\nCurrent Turn: ${interaction.user} (X)`,
            components: getComponents()
        });
        const gameMsg = await interaction.fetchReply();

        const collector = gameMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 * 5 });

        collector.on('collect', async (i: ButtonInteraction) => {
            const idx = parseInt(i.customId.split('_')[1]!);
            const currentPlayer = turn === 1 ? interaction.user : opponent;

            if (i.user.id !== currentPlayer.id) {
                await i.reply({ content: "今は相手のターンです！", ephemeral: true });
                return;
            }

            // Update board
            board[idx] = turn;

            // Check Win
            if (checkWin(board, turn)) {
                await i.update({
                    content: `ゲーム終了！${currentPlayer} (${turn === 1 ? 'X' : 'O'}) の勝ちです！`,
                    components: []
                });
                collector.stop();
                return;
            }

            // Check Draw
            if (board.every(cell => cell !== 0)) {
                await i.update({
                    content: `ゲーム終了！引き分けです！`,
                    components: []
                });
                collector.stop();
                return;
            }

            // Switch Turn
            turn = turn === 1 ? 2 : 1;
            let nextPlayer = turn === 1 ? interaction.user : opponent;

            // AI Turn Handling
            if (opponent.id === client.user?.id && turn === 2) {
                // Determine AI Move
                const aiMove = getBestMove(board, 2); // Bot is always 2 (O)
                
                if (aiMove !== -1) {
                    board[aiMove] = 2; // Make move
                    
                    // Check AI Win
                    if (checkWin(board, 2)) {
                         await i.update({
                            content: `ゲーム終了！私BOT(O) の勝ちです、${interaction.user}！`,
                            components: []
                        });
                        collector.stop();
                        return;
                    }

                    // Check Draw (AI caused)
                    if (board.every(cell => cell !== 0)) {
                        await i.update({
                            content: `ゲーム終了！引き分けです！`,
                            components: []
                        });
                        collector.stop();
                        return;
                    }

                    // Switch back to User
                    turn = 1;
                    nextPlayer = interaction.user;
                }
            }

            await i.update({
                content: `Tic-Tac-Toe: ${interaction.user} (X) vs ${opponent} (O)\nCurrent Turn: ${nextPlayer} (${turn === 1 ? 'X' : 'O'})`,
                components: getComponents()
            });
        });

        collector.on('end', async (_, reason) => {
             if (reason === 'time') {
                 try {
                    await interaction.editReply({
                        content: '時間切れです！',
                        components: []
                    });
                 } catch (e) {}
             }
        });
    }
};

function getBestMove(board: number[], player: number): number {
    const opponent = player === 1 ? 2 : 1;
    
    // 1. Try to Win
    const winMove = findWinningMove(board, player);
    if (winMove !== -1) return winMove;

    // 2. Block Opponent
    const blockMove = findWinningMove(board, opponent);
    if (blockMove !== -1) return blockMove;

    // 3. Take Center
    if (board[4] === 0) return 4;

    // 4. Random Available
    const available = board.map((v, i) => v === 0 ? i : -1).filter(i => i !== -1);
    if (available.length > 0) {
        return available[Math.floor(Math.random() * available.length)]!;
    }
    
    return -1;
}

function findWinningMove(board: number[], player: number): number {
    const wins = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
        [0, 4, 8], [2, 4, 6]             // Diagonals
    ];

    for (const combo of wins) {
        const [a, b, c] = combo;
        // Check if 2 spots are filled by player and 1 is empty
        if (a === undefined || b === undefined || c === undefined) continue;

        if (board[a] === player && board[b] === player && board[c] === 0) return c;
        if (board[a] === player && board[c] === player && board[b] === 0) return b;
        if (board[b] === player && board[c] === player && board[a] === 0) return a;
    }
    return -1;
}

function checkWin(board: number[], player: number): boolean {
    const wins = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
        [0, 4, 8], [2, 4, 6]             // Diagonals
    ];
    return wins.some(combo => combo.every(idx => board[idx] === player));
}
