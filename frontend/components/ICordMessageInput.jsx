import { useState } from 'react';
import { iCordApi } from '../lib/icordApi';
import styles from '../styles/Home.module.css';

const ICordMessageInput = ({ roomId }) => {
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (text.trim() === '' || name.trim() === '') {
      alert('名前とメッセージを入力してください。');
      return;
    }

    setIsLoading(true);
    try {
      await iCordApi.sendMessage(roomId, text, name);
      setText('');
    } catch (error) {
      console.error("Error sending message:", error);
      alert('メッセージの送信に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={sendMessage} className={styles.messageInputForm}>
      <div>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="名前"
          className={styles.nameInput}
          disabled={isLoading}
        />
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="メッセージを入力..."
          className={styles.textInput}
          disabled={isLoading}
        />
        <button 
          type="submit" 
          className={styles.sendButton}
          disabled={isLoading}
        >
          {isLoading ? '送信中...' : '送信'}
        </button>
      </div>
    </form>
  );
};

export default ICordMessageInput;