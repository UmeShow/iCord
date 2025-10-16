const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const iCordApi = {
  // 部屋のメッセージを取得
  async getMessages(roomId) {
    const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/messages`);
    if (!response.ok) {
      throw new Error('Failed to fetch messages');
    }
    return response.json();
  },

  // メッセージを送信
  async sendMessage(roomId, content, author) {
    const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content, author }),
    });
    if (!response.ok) {
      throw new Error('Failed to send message');
    }
    return response.json();
  },

  // 部屋の存在確認
  async checkRoom(roomId) {
    try {
      const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/messages`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }
};