import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { iCordApi } from '../lib/icordApi';
import styles from '../styles/Home.module.css';

const ICordMessageList = ({ roomId }) => {
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    try {
      const data = await iCordApi.getMessages(roomId);
      setMessages(data.messages);
      scrollToBottom();
      setError(null);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError('メッセージの取得に失敗しました');
    }
  };

  useEffect(() => {
    if (roomId) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 3000); // 3秒ごとに更新
      return () => clearInterval(interval);
    }
  }, [roomId]);

  if (error) {
    return (
      <div className={styles.messageList}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.messageList}>
      {messages.map((message) => (
        <div key={message.id} className={styles.message}>
          <div className={styles.messageHeader}>
            <span className={styles.messageName}>{message.author}</span>
            <span className={styles.messageTime}>
              {format(new Date(message.timestamp), 'HH:mm')}
            </span>
          </div>
          <p className={styles.messageContent}>{message.content}</p>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ICordMessageList;