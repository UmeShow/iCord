const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

console.log('API_BASE_URL configured as:', API_BASE_URL);

export const iCordApi = {
  // 部屋のメッセージを取得
  async getMessages(roomId) {
    const url = `${API_BASE_URL}/rooms/${roomId}/messages`;
    console.log('Fetching messages from:', url);
    const response = await fetch(url);
    if (!response.ok) {
      console.error('Failed to fetch messages. Status:', response.status, 'StatusText:', response.statusText);
      throw new Error('Failed to fetch messages');
    }
    return response.json();
  },

  // メッセージを送信
  async sendMessage(roomId, content, author) {
    const url = `${API_BASE_URL}/rooms/${roomId}/messages`;
    console.log('Sending message to:', url);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content, author }),
    });
    if (!response.ok) {
      console.error('Failed to send message. Status:', response.status);
      throw new Error('Failed to send message');
    }
    return response.json();
  },

  // 部屋の存在確認
  async checkRoom(roomId) {
    const url = `${API_BASE_URL}/rooms/${roomId}/messages`;
    console.log('Checking room existence:', url);
    try {
      const response = await fetch(url);
      console.log('Room check response status:', response.status);
      const result = response.ok;
      console.log('Room exists?', result);
      return result;
    } catch (error) {
      console.error('Error checking room:', error);
      return false;
    }
  }
};