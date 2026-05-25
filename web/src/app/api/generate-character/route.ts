import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { db, admin } from "@/lib/firebase";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import OpenAI from "openai";
import { ICharacter, ConversationMode } from "@/types";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as unknown as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: "User ID not found" }, { status: 401 });
    }

    const body = await req.json() as { vibe: string; referenceImage?: string };
    const { vibe, referenceImage } = body;

    if (!vibe || vibe.trim().length === 0) {
      return NextResponse.json({ error: "Vibe description is required" }, { status: 400 });
    }

    // Get xAI API Key
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "API Key not configured" },
        { status: 500 }
      );
    }

    // Generate character using Grok
    const openai = new OpenAI({ apiKey, baseURL: "https://api.x.ai/v1" });

    const generationPrompt = `キャラクター生成アシスタントです。ユーザーの説明から、AIキャラクターのプロフィールを生成してください。${referenceImage ? "添付された画像も参照して、その画像のスタイルや雰囲気を反映させてください。" : ""}

ユーザーの説明:
${vibe}

このキャラクターに合わせて、以下の形式で有効なJSONのみを返してください（説明や記号は不要）：

{
  "name": "キャラクター名（日本語、2-4文字）",
  "personality": "性格の詳細説明（日本語、2-3文）",
  "tone": "話し方と話調（日本語、1-2文）",
  "goal": "キャラクターの目的や役割（日本語、1文）",
  "appearance": "外見・特徴の説明（日本語、2-3文）",
  "story": "簡単な背景設定（日本語、2-3文）",
  "gender": "性別（女性、男性、その他など）",
  "exampleDialogue": "会話例（日本語。ユーザーとAIの交換を改行で区切る。例：ユーザー: こんにちは\\nAI: こんにちは！今日はいい天気ね\\nユーザー: そうだね\\nAI: 一緒に散歩行かない？）"
}

重要：
- すべてのテキストは日本語
- 性格、話調、背景設定が一貫性を持つ
- JSONのみを返す（それ以外は不要）`;

    // Prepare content for Grok
    const contentParts: any[] = [{ type: "text", text: generationPrompt }];

    if (referenceImage) {
      // Extract base64 data and media type
      const base64Match = referenceImage.match(/^data:image\/([a-z]+);base64,(.+)$/);
      if (base64Match) {
        const mediaType = `image/${base64Match[1]}`;
        const base64Data = base64Match[2];

        contentParts.push({
          type: "image_url",
          image_url: {
            url: `data:${mediaType};base64,${base64Data}`
          }
        });
      }
    }

    const result = await openai.chat.completions.create({
      model: process.env.XAI_MODEL || "grok-4.20-0309-non-reasoning",
      messages: [{ role: "user", content: contentParts }],
      temperature: 0.7,
    });
    let responseText = result.choices[0].message?.content || "";

    // Clean up markdown formatting if present
    responseText = responseText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    // Parse the generated JSON
    let characterData: {
      name: string;
      personality: string;
      tone: string;
      goal: string;
      appearance: string;
      story: string;
      gender: string;
      exampleDialogue: string;
    };

    try {
      characterData = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", responseText);
      console.error("Parse error:", parseError);
      return NextResponse.json(
        { error: "Failed to parse generated character data. Please try again." },
        { status: 500 }
      );
    }

    // Generate system instruction
    function generateSystemInstruction(data: typeof characterData): string {
      return `You are ${data.name}${data.gender ? ` (${data.gender})` : ""}.

Personality: ${data.personality}
Tone of voice: ${data.tone}
Appearance: ${data.appearance}
Background: ${data.story}

Instructions:
- Respond naturally in Japanese as this character
- Never identify yourself as an AI, bot, or language model
- Be authentic and responsive to the conversation
- Use simple actions in asterisks if appropriate (*smiles*, *nods*)
- Stay true to your character's personality throughout the conversation

[CONVERSATION MODE: CASUAL]
- Keep response concise and conversational (1-3 sentences typical)
- Natural, everyday interaction style`;
    }

    // Create character in Firestore
    const newCharacter: ICharacter = {
      ownerId: userId,
      name: characterData.name,
      botToken: "",
      clientId: "",
      discordTokenRequired: false,
      nickname: "",
      errorMessage: "",
      aiTemperature: 0.9,
      aiTopP: 0.95,
      aiTopK: 40,
      aiMaxOutputTokens: 512,
      personality: characterData.personality,
      tone: characterData.tone,
      appearance: characterData.appearance,
      gender: characterData.gender,
      story: characterData.story,
      goal: characterData.goal,
      customRules: "",
      exampleDialogue: characterData.exampleDialogue,
      avatarUrl: "",
      mode: ConversationMode.CASUAL,
      systemInstruction: generateSystemInstruction(characterData),
      isActive: true,
    };

    // Add to Firestore
    const charactersRef = db.collection("characters");
    const docRef = await charactersRef.add(newCharacter);

    return NextResponse.json({
      success: true,
      characterId: docRef.id,
      character: {
        id: docRef.id,
        ...newCharacter,
      },
    });
  } catch (error) {
    console.error("Character generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
