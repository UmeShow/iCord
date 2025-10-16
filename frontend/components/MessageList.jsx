import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { format } from 'date-fns';
import styles from '../styles/Home.module.css';

const MessageList = () => {
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // メッセージリストが更新されたら自動スクロール
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const q = query(collection(db, 'messages'), orderBy('timestamp'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const newMessages = [];
      querySnapshot.forEach((doc) => {
        newMessages.push({ id: doc.id, ...doc.data() });
      });
      setMessages(newMessages);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className={styles.messageList}>
      {messages.map((message) => (
        <div key={message.id} className={styles.message}>
          <div>
            <div className={styles.messageHeader}>
              <span className={styles.messageName}>{message.author}</span>
              <span className={styles.messageTime}>
                {message.timestamp ? format(message.timestamp.toDate(), 'HH:mm') : ''}
              </span>
            </div>
            <p className={styles.messageContent}>{message.text}</p>
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} /> {/* 自動スクロール用の空のdiv */}
    </div>
  );
};

export default MessageList;
