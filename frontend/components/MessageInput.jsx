import { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import styles from '../styles/Home.module.css';

const MessageInput = () => {
  const [name, setName] = useState('');
  const [text, setText] = useState('');

  const sendMessage = async (e) => {
    e.preventDefault();
    if (text.trim() === '' || name.trim() === '') {
      alert('名前とメッセージを入力してください。');
      return;
    }

    try {
      await addDoc(collection(db, 'messages'), {
        text: text,
        author: name,
        timestamp: serverTimestamp(),
      });
      setText('');
    } catch (error) {
      console.error("Error adding document: ", error);
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
        />
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="メッセージを入力..."
          className={styles.textInput}
        />
        <button type="submit" className={styles.sendButton}>送信</button>
      </div>
    </form>
  );
};

export default MessageInput;
