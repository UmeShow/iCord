# iCord.me Discord AI Bot

iCord.me is a Discord AI Chat Bot that brings your custom AI Friends to life using Google's Gemini AI.

## Features

-   **Custom AI Personas**: Roleplay with unique characters defined on iCord.me.
-   **Safety First**: Built-in safety filters for NSFW, hate speech, and harassment.
-   **User Consent**: Strict opt-in policy for data collection.
-   **Privacy**: Data retention policies respected.
-   **Rate Limiting**: Prevents spam and abuse.

## Setup

1.  **Clone the repository**
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Configure Environment**:
    Copy `.env.example` to `.env` and fill in your details:
    ```bash
    cp .env.example .env
    ```
    -   `DISCORD_TOKEN`: Get this from the [Discord Developer Portal](https://discord.com/developers/applications).
    -   `GEMINI_API_KEY`: Get this from [Google AI Studio](https://aistudio.google.com/).
    -   **Firebase Configuration**:
        1.  Go to the [Firebase Console](https://console.firebase.google.com/).
        2.  Create a new project (or use an existing one).
        3.  Go to **Project Settings** (gear icon) -> **Service accounts**.
        4.  Click **Generate new private key**. This will download a JSON file.
        5.  Open the JSON file and copy the values to your `.env` file:
            -   `FIREBASE_PROJECT_ID`: `project_id` from JSON
            -   `FIREBASE_CLIENT_EMAIL`: `client_email` from JSON
            -   `FIREBASE_PRIVATE_KEY`: `private_key` from JSON (Keep the `\n` newlines inside the quotes if pasting into .env, or handle them carefully).

4.  **Create a Test Character**:
    Since the iCord.me website isn't running locally, you can use the seed script to create a character for your Discord user.
    -   Open `src/scripts/seed.ts`.
    -   Replace `'REPLACE_WITH_YOUR_DISCORD_ID'` with your actual Discord User ID (Right-click your profile in Discord -> Copy User ID).
    -   Run the script:
        ```bash
        npx ts-node src/scripts/seed.ts
        ```

5.  **Build**:
    ```bash
    npm run build
    ```

6.  **Run**:
    ```bash
    npm start
    ```

## Development

To run in development mode with hot reloading:
```bash
npm run dev
```

## Debugging in VS Code

1.  Go to the **Run and Debug** view (Ctrl+Shift+D).
2.  Select **Debug Bot (ts-node)**.
3.  Press **F5** to start debugging.

## Safety & Compliance

-   **Consent**: The bot will ask for consent before the first interaction.
-   **Moderation**: All inputs and outputs are filtered using Gemini's safety settings.
-   **Data**: User data is stored in MongoDB. Ensure you have a policy to delete data > 30 days old.

## License

[Your License Here]
