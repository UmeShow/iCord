import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { format } from 'date-fns';
import Image from 'next/image';
import styles from '../styles/Home.module.css';

const MessageList = ({ collectionName = 'messages' }) => {
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const q = query(collection(db, collectionName), orderBy('timestamp'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const newMessages = [];
      querySnapshot.forEach((doc) => {
        newMessages.push({ id: doc.id, ...doc.data() });
      });
      setMessages(newMessages);
    });

    return () => unsubscribe();
  }, [collectionName]);

  const handleDelete = async (messageId) => {
    if (confirm('このメッセージを削除しますか？')) {
      try {
        await deleteDoc(doc(db, collectionName, messageId));
      } catch (error) {
        console.error("Error deleting message:", error);
        alert('メッセージの削除に失敗しました。');
      }
    }
  };

  // 画像URLを検出する関数
  const detectImageUrl = (text) => {
    const imageUrlRegex = /(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp|bmp|svg))/gi;
    return text.match(imageUrlRegex);
  };

  // テキスト内の画像URLを埋め込みに変換
  const renderMessageContent = (text) => {
    const imageUrls = detectImageUrl(text);
    
    if (!imageUrls) {
      return <p className={styles.messageContent}>{text}</p>;
    }

    const parts = [];
    let remainingText = text;

    imageUrls.forEach((url, index) => {
      const urlIndex = remainingText.indexOf(url);
      if (urlIndex > 0) {
        parts.push(
          <p key={`text-${index}`} className={styles.messageContent}>
            {remainingText.substring(0, urlIndex)}
          </p>
        );
      }
      parts.push(
        <div key={`img-${index}`} className={styles.messageImage}>
          <img src={url} alt="埋め込み画像" />
        </div>
      );
      remainingText = remainingText.substring(urlIndex + url.length);
    });

    if (remainingText) {
      parts.push(
        <p key="text-last" className={styles.messageContent}>
          {remainingText}
        </p>
      );
    }

    return parts;
  };

  return (
    <div className={styles.messageList}>
      {messages.map((message) => (
        <div key={message.id} className={styles.message}>
          <div className={styles.messageIcon}>
            <Image
              src={message.icon || '/icons/anonymous.png'}
              alt="User Icon"
              width={32}
              height={32}
              className={styles.userMessageIcon}
            />
          </div>
          <div className={styles.messageMain}>
            <div className={styles.messageHeader}>
              <span className={styles.messageName}>{message.author}</span>
              <span className={styles.messageTime}>
                {message.timestamp ? format(message.timestamp.toDate(), 'HH:mm') : ''}
              </span>
            </div>
            {renderMessageContent(message.text)}
          </div>
          <button 
            className={styles.deleteButton}
            onClick={() => handleDelete(message.id)}
            title="削除"
          >
            ×
          </button>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
