import { useState } from 'react';
import styles from '../styles/InvitePanel.module.css';

const InvitePanel = ({ boardId, boardName }) => {
  const [showPanel, setShowPanel] = useState(false);
  const [copied, setCopied] = useState(false);

  const inviteUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}?board=${boardId}`
    : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.inviteContainer}>
      <button 
        className={styles.inviteButton}
        onClick={() => setShowPanel(!showPanel)}
        title="招待リンクを生成"
      >
        <span className={styles.inviteIcon}>👥</span>
      </button>

      {showPanel && (
        <div className={styles.invitePanel}>
          <h3>{boardName}への招待</h3>
          <p className={styles.description}>
            このリンクを共有して、掲示板に招待しましょう
          </p>
          
          <div className={styles.linkContainer}>
            <input
              type="text"
              value={inviteUrl}
              readOnly
              className={styles.linkInput}
            />
            <button
              onClick={handleCopy}
              className={styles.copyButton}
            >
              {copied ? '✓ コピー済み' : '📋 コピー'}
            </button>
          </div>

          <button
            onClick={() => setShowPanel(false)}
            className={styles.closeButton}
          >
            閉じる
          </button>
        </div>
      )}
    </div>
  );
};

export default InvitePanel;
