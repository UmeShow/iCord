import { useState } from 'react';
import Image from 'next/image';
import styles from '../styles/Sidebar.module.css';

const Sidebar = ({ onModeChange, boards, onAddBoard, activeBoard, onSelectBoard }) => {
  const [activeMode, setActiveMode] = useState('bulletin');

  const handleModeChange = (mode) => {
    setActiveMode(mode);
    onModeChange(mode);
  };

  const handleAddBoard = () => {
    const name = prompt('新しい掲示板の名前を入力してください:');
    if (name) {
      const newBoard = onAddBoard(name);
      onSelectBoard(newBoard);
    }
  };

  return (
    <div className={styles.sidebar}>
      {/* 掲示板セクション */}
      <div className={styles.boardSection}>
        {boards.map((board) => (
          <button 
            key={board.id}
            className={`${styles.iconButton} ${activeMode === 'bulletin' && activeBoard?.id === board.id ? styles.active : ''}`}
            onClick={() => {
              handleModeChange('bulletin');
              onSelectBoard(board);
            }}
            title={board.name}
          >
            <Image
              src="/icons/keiji.png"
              alt={board.name}
              width={40}
              height={40}
            />
          </button>
        ))}
        
        {/* 新規掲示板作成ボタン */}
        <button 
          className={`${styles.iconButton} ${styles.addButton}`}
          onClick={handleAddBoard}
          title="新しい掲示板を作成"
        >
          <span className={styles.plusIcon}>+</span>
        </button>
      </div>

      {/* 区切り線 */}
      <div className={styles.divider}></div>

      {/* iCordモード */}
      <button 
        className={`${styles.iconButton} ${activeMode === 'icord' ? styles.active : ''}`}
        onClick={() => handleModeChange('icord')}
        title="iCord"
      >
        <Image
          src="/icons/icord.png"
          alt="iCord"
          width={40}
          height={40}
        />
      </button>
    </div>
  );
};

export default Sidebar;