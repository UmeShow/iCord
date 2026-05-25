import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { db, admin } from "@/lib/firebase";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json() as { command: string; characterId: string };
    const { command, characterId } = body;
    const userId = (session.user as unknown as { id?: string }).id;

    if (!userId || !characterId || !command) {
      console.error("Missing fields:", { userId, characterId, command });
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify user owns this character
    const charDoc = await db.collection("characters").doc(characterId).get();
    if (!charDoc.exists) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    const character = charDoc.data();
    if (character?.ownerId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    let response = "";

    switch (command.toLowerCase()) {
      case "/wack":
        // Reset character memory by updating wackToken
        const newWackToken = `wack_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await db.collection("characters").doc(characterId).update({
          wackToken: newWackToken,
          wackRequestedAt: admin.firestore.FieldValue.serverTimestamp(),
          wackRequestedBy: userId,
        });
        response = `✨ ${character?.name || "Character"} がリセットされました！メモリが消去されました。`;
        break;

      case "/shiritori":
        response = `🎮 しりとりゲーム開始！\n\n最後の文字で始まる言葉を言ってください。\nBot: 「りんご」\nあなた: 「ゴリラ」という感じで遊びます！`;
        break;

      case "/tictactoe":
        response = `🎯 マルバツゲーム（TicTacToe）\n\n初期盤面:\n\`\`\`\n1 | 2 | 3\n---------\n4 | 5 | 6\n---------\n7 | 8 | 9\n\`\`\`\n\n番号を指定して対戦します。あなたは「O」、AIは「X」です！`;
        break;

      case "/yesno":
        response = `🎲 Yes/No ゲーム\n\n何か質問をしてください。AIがランダムにYesかNoで答えます！`;
        break;

      case "/wordwolf":
        response = `🐺 ワードウルフゲーム\n\nお題が与えられます。その中で、一人だけ違うお題を与えられた「人狼」がいます。\n会話の中から人狼を見つけ出してください！`;
        break;

      default:
        return NextResponse.json(
          { error: `Unknown command: ${command}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true, response });
  } catch (error) {
    console.error("Command execution error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
