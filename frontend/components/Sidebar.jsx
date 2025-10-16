import { useState } from 'react';
import Image from 'next/image';
import styles from '../styles/Sidebar.module.css';

const Sidebar = ({ onModeChange }) => {
  const [activeMode, setActiveMode] = useState('bulletin'); // 'bulletin' or 'icord'

  const handleModeChange = (mode) => {
    setActiveMode(mode);
    onModeChange(mode);
  };

  return (
    <div className={styles.sidebar}>
      <button 
        className={`${styles.iconButton} ${activeMode === 'bulletin' ? styles.active : ''}`}
        onClick={() => handleModeChange('bulletin')}
      >
        <Image
          src="/icons/keiji.png"
          alt="掲示板"
          width={40}
          height={40}
        />
      </button>
      <button 
        className={`${styles.iconButton} ${activeMode === 'icord' ? styles.active : ''}`}
        onClick={() => handleModeChange('icord')}
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