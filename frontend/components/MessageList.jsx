import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

const MessageList = () => {
  const [messages, setMessages] = useState([]);

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
    <div className="message-list">
      {messages.map((message) => (
        <div key={message.id} className="message">
          <p><strong>{message.author}</strong>: {message.text}</p>
        </div>
      ))}
    </div>
  );
};

export default MessageList;
