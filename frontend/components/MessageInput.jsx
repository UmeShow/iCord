import { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const MessageInput = () => {
  const [text, setText] = useState('');

  const sendMessage = async (e) => {
    e.preventDefault();
    if (text.trim() === '') return;

    try {
      await addDoc(collection(db, 'messages'), {
        text: text,
        author: 'WebAppUser', // Replace with actual user later
        timestamp: serverTimestamp(),
      });
      setText('');
    } catch (error) {
      console.error("Error adding document: ", error);
    }
  };

  return (
    <form onSubmit={sendMessage} className="message-input">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type your message..."
      />
      <button type="submit">Send</button>
    </form>
  );
};

export default MessageInput;
