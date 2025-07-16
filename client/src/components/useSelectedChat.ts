import { useState } from 'react';
import chatsData from '../dummyChats.json';

export function useSelectedChat() {
  const [selectedChatId, setSelectedChatId] = useState<number | null>(chatsData[0].id);
  const selectedChat = chatsData.find((c: any) => c.id === selectedChatId) ?? null;
  return { selectedChatId, setSelectedChatId, selectedChat, chatsData };
}
