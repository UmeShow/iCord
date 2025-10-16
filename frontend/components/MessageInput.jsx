import { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import Image from 'next/image';
import styles from '../styles/Home.module.css';

const MessageInput = ({ userName, userIcon, collectionName = 'messages' }) => {
  const [text, setText] = useState('');

  const sendMessage = async (e) => {
    e.preventDefault();
    if (text.trim() === '') {
      return;
    }

    const author = userName || '名無し';
    const icon = userIcon || '/icons/anonymous.png';

    try {
      await addDoc(collection(db, collectionName), {
        text: text,
        author: author,
        icon: icon,
        timestamp: serverTimestamp(),
      });
      setText('');
    } catch (error) {
      console.error("Error adding document: ", error);
    }
  };

  return (
    <form onSubmit={sendMessage} className={styles.messageInputForm}>
      <div className={styles.inputContainer}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="メッセージを入力..."
          className={styles.textInputExpanded}
        />
        <button type="submit" className={styles.sendButtonIcon}>
          <span className={styles.sendIcon}>→</span>
        </button>
      </div>
    </form>
  );
};

export default MessageInput;
