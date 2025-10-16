import { useState, useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import MessageList from '../components/MessageList';
import MessageInput from '../components/MessageInput';
import ICordMessageList from '../components/ICordMessageList';
import ICordMessageInput from '../components/ICordMessageInput';
import Sidebar from '../components/Sidebar';
import RoomDialog from '../components/RoomDialog';
import UserSettings from '../components/UserSettings';
import InvitePanel from '../components/InvitePanel';
import { useUserSettings, useBulletinBoards, useRoomHistory } from '../lib/hooks';
import styles from '../styles/Home.module.css';

export default function Home() {
  const [mode, setMode] = useState('bulletin');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [roomId, setRoomId] = useState(null);
  
  // カスタムフックを使用
  const { userName, userIcon, updateUserName, updateUserIcon } = useUserSettings();
  const { boards, addBoard, removeBoard } = useBulletinBoards();
  const { roomHistory, addRoomToHistory } = useRoomHistory();
  const [activeBoard, setActiveBoard] = useState(null);

  useEffect(() => {
    if (boards.length > 0 && !activeBoard) {
      setActiveBoard(boards[0]);
    }
  }, [boards, activeBoard]);

  // URLパラメータから掲示板IDを取得
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const boardId = params.get('board');
    if (boardId) {
      const board = boards.find(b => b.id === boardId);
      if (board) {
        setActiveBoard(board);
        setMode('bulletin');
      }
    }
  }, [boards]);

  const handleModeChange = (newMode) => {
    if (newMode === 'icord' && !roomId) {
      setIsDialogOpen(true);
    }
    setMode(newMode);
  };

  const handleRoomConnect = async (inputRoomId) => {
    setRoomId(inputRoomId);
    addRoomToHistory(inputRoomId);
    setIsDialogOpen(false);
  };

  const handleSelectBoard = (board) => {
    setActiveBoard(board);
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>iCord</title>
        <meta name="description" content="Discord-like web app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Sidebar 
        onModeChange={handleModeChange}
        boards={boards}
        onAddBoard={addBoard}
        activeBoard={activeBoard}
        onSelectBoard={handleSelectBoard}
      />

      <main className={styles.main}>
        <header className={styles.header}>
          <Image src="/icordlogo.png" alt="iCord Logo" width={120} height={40} />
          <span className={styles.headerTitle}>
            {mode === 'bulletin' ? activeBoard?.name || '掲示板' : `iCord - Room: ${roomId || 'Not Connected'}`}
          </span>
          <div className={styles.headerActions}>
            {mode === 'bulletin' && activeBoard && (
              <InvitePanel boardId={activeBoard.id} boardName={activeBoard.name} />
            )}
            <UserSettings
              userName={userName}
              userIcon={userIcon}
              onUpdateName={updateUserName}
              onUpdateIcon={updateUserIcon}
            />
          </div>
        </header>

        <div className={styles.chatContainer}>
          {mode === 'bulletin' ? (
            activeBoard && (
              <>
                <MessageList collectionName={activeBoard.collection} />
                <MessageInput 
                  userName={userName}
                  userIcon={userIcon}
                  collectionName={activeBoard.collection}
                />
              </>
            )
          ) : (
            roomId && (
              <>
                <ICordMessageList roomId={roomId} />
                <ICordMessageInput roomId={roomId} userName={userName} />
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
        roomHistory={roomHistory}
      />
    </div>
  );
}
