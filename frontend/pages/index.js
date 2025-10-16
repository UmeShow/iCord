import { useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import MessageList from '../components/MessageList';
import MessageInput from '../components/MessageInput';
import ICordMessageList from '../components/ICordMessageList';
import ICordMessageInput from '../components/ICordMessageInput';
import Sidebar from '../components/Sidebar';
import RoomDialog from '../components/RoomDialog';
import styles from '../styles/Home.module.css';

export default function Home() {
  const [mode, setMode] = useState('bulletin');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [roomId, setRoomId] = useState(null);

  const handleModeChange = (newMode) => {
    if (newMode === 'icord' && !roomId) {
      setIsDialogOpen(true);
    }
    setMode(newMode);
  };

  const handleRoomConnect = async (inputRoomId) => {
    setRoomId(inputRoomId);
    setIsDialogOpen(false);
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>iCord</title>
        <meta name="description" content="Discord-like web app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Sidebar onModeChange={handleModeChange} />

      <main className={styles.main}>
        <header className={styles.header}>
          <Image src="/icordlogo.png" alt="iCord Logo" width={120} height={40} />
          <span className={styles.headerTitle}>
            {mode === 'bulletin' ? '掲示板' : `iCord - Room: ${roomId || 'Not Connected'}`}
          </span>
        </header>

        <div className={styles.chatContainer}>
          {mode === 'bulletin' ? (
            <>
              <MessageList />
              <MessageInput />
            </>
          ) : (
            roomId && (
              <>
                <ICordMessageList roomId={roomId} />
                <ICordMessageInput roomId={roomId} />
              </>
            )
          )}
        </div>
      </main>

      <RoomDialog 
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          if (!roomId) setMode('bulletin');
        }}
        onConnect={handleRoomConnect}
      />
    </div>
  );
}
