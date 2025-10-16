import { useState, useEffect } from 'react';

export const useUserSettings = () => {
  const [userName, setUserName] = useState('');
  const [userIcon, setUserIcon] = useState('');

  useEffect(() => {
    // ローカルストレージから設定を読み込む
    const savedName = localStorage.getItem('userName') || '';
    const savedIcon = localStorage.getItem('userIcon') || '/icons/anonymous.png';
    setUserName(savedName);
    setUserIcon(savedIcon);
  }, []);

  const updateUserName = (name) => {
    setUserName(name);
    localStorage.setItem('userName', name);
  };

  const updateUserIcon = (icon) => {
    setUserIcon(icon);
    localStorage.setItem('userIcon', icon);
  };

  return {
    userName,
    userIcon,
    updateUserName,
    updateUserIcon,
  };
};

// 部屋履歴を管理するカスタムフック
export const useRoomHistory = () => {
  const [roomHistory, setRoomHistory] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('roomHistory');
    if (saved) {
      setRoomHistory(JSON.parse(saved));
    }
  }, []);

  const addRoomToHistory = (roomId, roomName = '') => {
    const newHistory = [
      { id: roomId, name: roomName || roomId, timestamp: Date.now() },
      ...roomHistory.filter(room => room.id !== roomId)
    ].slice(0, 10); // 最大10件まで保存

    setRoomHistory(newHistory);
    localStorage.setItem('roomHistory', JSON.stringify(newHistory));
  };

  const removeFromHistory = (roomId) => {
    const newHistory = roomHistory.filter(room => room.id !== roomId);
    setRoomHistory(newHistory);
    localStorage.setItem('roomHistory', JSON.stringify(newHistory));
  };

  return {
    roomHistory,
    addRoomToHistory,
    removeFromHistory,
  };
};

// 掲示板を管理するカスタムフック
export const useBulletinBoards = () => {
  const [boards, setBoards] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('bulletinBoards');
    if (saved) {
      setBoards(JSON.parse(saved));
    } else {
      // デフォルトの掲示板
      setBoards([{ id: 'default', name: '掲示板', collection: 'messages' }]);
    }
  }, []);

  const addBoard = (name) => {
    const newBoard = {
      id: `board_${Date.now()}`,
      name: name || '新しい掲示板',
      collection: `messages_${Date.now()}`,
    };
    const newBoards = [...boards, newBoard];
    setBoards(newBoards);
    localStorage.setItem('bulletinBoards', JSON.stringify(newBoards));
    return newBoard;
  };

  const removeBoard = (boardId) => {
    const newBoards = boards.filter(board => board.id !== boardId);
    setBoards(newBoards);
    localStorage.setItem('bulletinBoards', JSON.stringify(newBoards));
  };

  return {
    boards,
    addBoard,
    removeBoard,
  };
};
