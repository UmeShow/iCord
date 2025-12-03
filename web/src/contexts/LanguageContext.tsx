"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'ja';

interface Translations {
  dashboard: {
    title: string;
    subtitle: string;
    newFriend: string;
    myFriends: string;
    noFriends: string;
    status: string;
    active: string;
    inactive: string;
    edit: string;
  };
  newFriend: {
    title: string;
    subtitle: string;
    tokenLabel: string;
    tokenPlaceholder: string;
    clientIdLabel: string;
    clientIdPlaceholder: string;
    nameLabel: string;
    save: string;
    saving: string;
    inviteLink: string;
    setupGuide: string;
    nicknameLabel: string;
    nicknamePlaceholder: string;
    personalityLabel: string;
    personalityPlaceholder: string;
    toneLabel: string;
    tonePlaceholder: string;
    goalLabel: string;
    goalPlaceholder: string;
    avatarLabel: string;
    avatarPlaceholder: string;
    discordIntegration: string;
    botActive: string;
    botInactive: string;
    updateTitle: string;
    updateSubtitle: string;
    updateSave: string;
    updateSaving: string;
  };
  common: {
    login: string;
    logout: string;
    dashboard: string;
    language: string;
  };
}

const translations: Record<Language, Translations> = {
  en: {
    dashboard: {
      title: "Dashboard",
      subtitle: "Manage your AI Friends",
      newFriend: "+ New Friend",
      myFriends: "My Friends",
      noFriends: "You haven't created any friends yet.",
      status: "Status",
      active: "Active",
      inactive: "Inactive",
      edit: "Edit",
    },
    newFriend: {
      title: "Create New Friend",
      subtitle: "Connect a Discord Bot to start",
      tokenLabel: "Discord Bot Token",
      tokenPlaceholder: "Paste your bot token here",
      clientIdLabel: "Client ID (Application ID)",
      clientIdPlaceholder: "Paste Client ID here",
      nameLabel: "Character Name",
      save: "Create Friend",
      saving: "Creating...",
      inviteLink: "Invite Link",
      setupGuide: "How to get a token?",
      nicknameLabel: "Nickname (Optional)",
      nicknamePlaceholder: "Alice",
      personalityLabel: "Personality",
      personalityPlaceholder: "Describe the AI's personality (e.g., Cheerful, Tsundere, Helpful, Sarcastic...)",
      toneLabel: "Speaking Tone / Style",
      tonePlaceholder: "e.g. Casual, Formal, Uses emojis, Ends sentences with 'meow'",
      goalLabel: "Goal / Role",
      goalPlaceholder: "e.g. To be a supportive friend, To help with coding, To entertain",
      avatarLabel: "Avatar URL (Optional)",
      avatarPlaceholder: "e.g. https://example.com/image.png",
      discordIntegration: "Discord Integration",
      botActive: "Bot Active",
      botInactive: "Bot Inactive",
      updateTitle: "Edit Friend",
      updateSubtitle: "Update your AI friend's settings.",
      updateSave: "Save Changes",
      updateSaving: "Saving...",
    },
    common: {
      login: "Login with Discord",
      logout: "Sign Out",
      dashboard: "Dashboard",
      language: "Language",
    },
  },
  ja: {
    dashboard: {
      title: "ダッシュボード",
      subtitle: "AIフレンドの管理",
      newFriend: "+ 新しいフレンド",
      myFriends: "あなたのフレンド",
      noFriends: "まだフレンドがいません。",
      status: "ステータス",
      active: "稼働中",
      inactive: "停止中",
      edit: "編集",
    },
    newFriend: {
      title: "新しいフレンドを作成",
      subtitle: "Discord Botを連携して始めよう",
      tokenLabel: "Discord Bot Token",
      tokenPlaceholder: "Botのトークンを貼り付けてください",
      clientIdLabel: "クライアントID (Application ID)",
      clientIdPlaceholder: "クライアントIDを貼り付けてください",
      nameLabel: "フレンド名",
      save: "フレンドを作成",
      saving: "作成中...",
      inviteLink: "招待リンク",
      setupGuide: "トークンの取得方法は？",
      nicknameLabel: "ニックネーム (任意)",
      nicknamePlaceholder: "例: アリスちゃん",
      personalityLabel: "性格",
      personalityPlaceholder: "AIの性格を記述してください (例: 明るい、ツンデレ、親切、かわいい...)",
      toneLabel: "口調 / 話し方",
      tonePlaceholder: "例: カジュアル、敬語、絵文字を使う、語尾に「にゃん」をつける",
      goalLabel: "目標 / 役割",
      goalPlaceholder: "例: 良き相談相手になる、コーディングを手伝う、楽しませる",
      avatarLabel: "アイコン画像のURL (任意)",
      avatarPlaceholder: "例: https://example.com/image.png",
      discordIntegration: "Discord連携設定",
      botActive: "ボット稼働中",
      botInactive: "ボット停止中",
      updateTitle: "フレンドを編集",
      updateSubtitle: "AIフレンドの設定を更新します。",
      updateSave: "変更を保存",
      updateSaving: "保存中...",
    },
    common: {
      login: "Discordでログイン",
      logout: "ログアウト",
      dashboard: "ダッシュボード",
      language: "言語",
    },
  },
};

const LanguageContext = createContext<{
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}>({
  language: 'en',
  setLanguage: () => {},
  t: translations.en,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translations[language] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
