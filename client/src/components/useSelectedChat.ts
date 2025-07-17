import { useEffect, useState } from 'react';
import axios from 'axios';

  const [chatsData, setChatsData] = useState<any[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const selectedChat = chatsData.find((c: any) => c._id === selectedChatId) ?? null;

  useEffect(() => {
    axios.get('http://localhost:3001/api/chats')
      .then(res => {
        setChatsData(res.data);
        if (res.data.length > 0 && selectedChatId === null) {
          setSelectedChatId(res.data[0]._id);
        }
      })
      .catch(() => setChatsData([]));
    // eslint-disable-next-line
  }, []);

  return { selectedChatId, setSelectedChatId, selectedChat, chatsData };
}
