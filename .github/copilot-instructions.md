<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

This project is a Discord AI Chat Bot named "iCord.me".
It uses Google's Gemini AI (Gemini 2.0 Flash or similar) for generating responses.
The stack is TypeScript, Node.js, Discord.js, Firebase (Firestore), and Express.

Key Features & Safety Requirements:
1.  **User Consent**: Users must consent to data collection before chatting.
2.  **Privacy**: Data retention policies must be respected (e.g., auto-delete after 30 days).
3.  **Safety Filters**: Use Gemini's safety settings to block NSFW, hate speech, and harassment.
4.  **Rate Limiting**: Prevent spam by rate-limiting user requests.
5.  **Roleplay**: The bot acts as a specific "AI Friend" defined by the user on the iCord.me website.

When generating code:
-   Ensure strict typing with TypeScript.
-   Use `discord.js` v14+.
-   Implement robust error handling.
-   Follow the safety guidelines strictly (filtering, consent, rate limits).
