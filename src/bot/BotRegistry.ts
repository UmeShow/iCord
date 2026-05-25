import type { BotInstance } from './BotInstance';

class BotRegistry {
  private botsById = new Map<string, BotInstance>();

  private normalizeName(value: string) {
    let v = (value || '').trim().toLowerCase();
    if (!v) return '';

    // strip zero-width chars
    v = v.replace(/[\u200B-\u200D\uFEFF]/g, '');

    // Bot mention format: <@123> or <@!123>
    const mention = v.match(/^<@!?(\d+)>$/);
    if (mention?.[1]) return `id:${mention[1]}`;

    // common user input patterns
    if (v.startsWith('@')) v = v.slice(1);
    // Discord-style name#1234
    const hashIndex = v.indexOf('#');
    if (hashIndex > 0) v = v.slice(0, hashIndex);

    return v.trim();
  }

  register(bot: BotInstance) {
    const id = bot.characterId;
    if (!id) return;
    this.botsById.set(id, bot);
  }

  unregister(characterId: string) {
    this.botsById.delete(characterId);
  }

  getById(characterId: string): BotInstance | undefined {
    return this.botsById.get(characterId);
  }

  /**
   * Finds a bot by character name or nickname (case-insensitive).
   * If multiple match, returns the first.
   */
  findByName(nameOrNickname: string, excludeCharacterId?: string): BotInstance | undefined {
    const needle = this.normalizeName(nameOrNickname);
    if (!needle) return undefined;

    // mention -> match by bot user id
    if (needle.startsWith('id:')) {
      const id = needle.slice(3);
      for (const bot of this.botsById.values()) {
        if (excludeCharacterId && bot.characterId === excludeCharacterId) continue;
        if (bot.botUserId && bot.botUserId === id) return bot;
      }
      return undefined;
    }

    for (const bot of this.botsById.values()) {
      if (excludeCharacterId && bot.characterId === excludeCharacterId) continue;
      const candidates = [bot.characterName, bot.characterNickname].filter(Boolean) as string[];
      if (candidates.some((c) => this.normalizeName(c) === needle)) {
        return bot;
      }
    }

    // fallback: substring match
    for (const bot of this.botsById.values()) {
      if (excludeCharacterId && bot.characterId === excludeCharacterId) continue;
      const candidates = [bot.characterName, bot.characterNickname].filter(Boolean) as string[];
      if (candidates.some((c) => this.normalizeName(c).includes(needle))) {
        return bot;
      }
    }

    return undefined;
  }

  listDisplayNames(): string[] {
    return Array.from(this.botsById.values()).map((b) => b.characterNickname || b.characterName);
  }
}

export const botRegistry = new BotRegistry();
