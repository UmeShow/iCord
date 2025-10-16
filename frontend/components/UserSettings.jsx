import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import styles from '../styles/UserSettings.module.css';

const UserSettings = ({ userName, userIcon, onUpdateName, onUpdateIcon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempName, setTempName] = useState(userName);
  const [tempIcon, setTempIcon] = useState(userIcon);
  const [isUploading, setIsUploading] = useState(false);
  const panelRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setTempName(userName);
    setTempIcon(userIcon);
  }, [userName, userIcon]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSave = () => {
    onUpdateName(tempName);
    onUpdateIcon(tempIcon);
    setIsOpen(false);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      // ファイルサイズチェック（100KB以下に制限して軽量化）
      if (file.size > 100 * 1024) {
        throw new Error('画像サイズは100KB以下にしてください。');
      }

      // 画像ファイルかチェック
      if (!file.type.startsWith('image/')) {
        throw new Error('画像ファイルを選択してください。');
      }

      // FileReaderで画像をBase64に変換
      const reader = new FileReader();
      reader.onload = (e) => {
        setTempIcon(e.target.result);
        alert('画像をアップロードしました！保存ボタンを押してください。');
        setIsUploading(false);
      };
      reader.onerror = () => {
        throw new Error('画像の読み込みに失敗しました。');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('アップロードエラー:', error);
      alert(error.message || '画像のアップロードに失敗しました。');
      setIsUploading(false);
    } finally {
      // ファイル入力をリセット
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const availableIcons = [
    '/icons/anonymous.png',
    '/icons/icord.png',
    '/icons/keiji.png',
  ];

  return (
    <div className={styles.userSettingsContainer} ref={panelRef}>
      <button 
        className={styles.userButton}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className={styles.userInfo}>
          <Image
            src={userIcon || '/icons/anonymous.png'}
            alt="User Icon"
            width={32}
            height={32}
            className={styles.userIcon}
          />
          <div className={styles.userDetails}>
            <div className={styles.userName}>{userName || '名無し'}</div>
            <div className={styles.userStatus}>
              <span className={styles.onlineDot}></span>
              オンライン
            </div>
          </div>
        </div>
      </button>

      {isOpen && (
        <div className={styles.settingsPanel}>
          <h3>ユーザー設定</h3>
          
          <div className={styles.settingGroup}>
            <label>名前</label>
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder="名前を入力"
              className={styles.nameInput}
            />
          </div>

          <div className={styles.settingGroup}>
            <label>アイコン</label>
            <div className={styles.iconGrid}>
              {availableIcons.map((icon) => (
                <button
                  key={icon}
                  className={`${styles.iconOption} ${tempIcon === icon ? styles.selected : ''}`}
                  onClick={() => setTempIcon(icon)}
                  type="button"
                >
                  <Image
                    src={icon}
                    alt="Icon"
                    width={40}
                    height={40}
                  />
                </button>
              ))}
            </div>
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={styles.uploadButton}
              disabled={isUploading}
            >
              {isUploading ? '⏳ アップロード中...' : '📁 画像をアップロード（100KB以下）'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            
            {tempIcon && !availableIcons.includes(tempIcon) && (
              <div className={styles.customIconPreview}>
                <p>カスタムアイコン:</p>
                <img src={tempIcon} alt="Custom Icon" />
              </div>
            )}
          </div>

          <div className={styles.buttonGroup}>
            <button onClick={handleSave} className={styles.saveButton}>
              保存
            </button>
            <button onClick={() => setIsOpen(false)} className={styles.cancelButton}>
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserSettings;
