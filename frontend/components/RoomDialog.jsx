import { useState } from 'react';
import { iCordApi } from '../lib/icordApi';
import styles from '../styles/Dialog.module.css';

const RoomDialog = ({ isOpen, onClose, onConnect, roomHistory = [] }) => {
  const [roomNumber, setRoomNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!roomNumber.trim()) {
      setError('部屋番号を入力してください。');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const exists = await iCordApi.checkRoom(roomNumber);
      if (exists) {
        onConnect(roomNumber);
      } else {
        setError('この部屋番号は存在しないか、アクセスできません。');
      }
    } catch (error) {
      setError('接続中にエラーが発生しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleHistoryClick = (roomId) => {
    setRoomNumber(roomId);
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={() => onClose()}>
      <div className={styles.dialog} onClick={e => e.stopPropagation()}>
        <h2>部屋番号を入力してください</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={roomNumber}
            onChange={(e) => setRoomNumber(e.target.value)}
            placeholder="部屋番号を入力"
            className={styles.input}
            disabled={isLoading}
          />
          {error && <p className={styles.error}>{error}</p>}
          
          {roomHistory.length > 0 && (
            <div className={styles.historySection}>
              <h3>接続履歴</h3>
              <div className={styles.historyList}>
                {roomHistory.map((room) => (
                  <button
                    key={room.id}
                    type="button"
                    className={styles.historyItem}
                    onClick={() => handleHistoryClick(room.id)}
                  >
                    <span className={styles.historyName}>{room.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className={styles.buttonGroup}>
            <button 
              type="button" 
              onClick={onClose} 
              className={styles.cancelButton}
              disabled={isLoading}
            >
              キャンセル
            </button>
            <button 
              type="submit" 
              className={styles.connectButton}
              disabled={isLoading}
            >
              {isLoading ? '接続中...' : '接続'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoomDialog;