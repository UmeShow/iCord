import { Command } from "./Command";
import { TicTacToe } from "./TicTacToe";
import { YesNo } from "./YesNo";
import { Shiritori } from "./Shiritori";
import { WordWolf } from "./WordWolf";

export const commands: Command[] = [
    TicTacToe,
    YesNo,
    Shiritori,
    WordWolf
];

export type { Command };
