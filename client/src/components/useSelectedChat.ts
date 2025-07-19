import { useEffect, useState } from 'react';
import axios from 'axios';

// Define the base API URL using Vite's environment variable.
// This variable will be set by Docker Compose during the frontend's build process.
// The fallback is for local development outside Docker.
const API_BASE_URL = import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:3001/api';

/**
 * Custom Hook (or utility function that uses hooks) to manage chat data.
 * Fetches initial chat data and provides state and setters for selected chat.
 */
export default function useSelectedChat() { // Assuming it's exported as a default function/hook
  const [chatsData, setChatsData] = useState([]); // Initialize with empty array
  const [selectedChatId, setSelectedChatId] = useState(null); // Initialize with null
  
  // Derive selectedChat based on chatsData and selectedChatId
  const selectedChat = chatsData.find((c: any) => c._id === selectedChatId) ?? null;

  useEffect(() => {
    // Make an API call to fetch all chats.
    // CHANGED: Use API_BASE_URL for the API endpoint.
    axios.get(`${API_BASE_URL}/chats`)
      .then(res => {
        setChatsData(res.data);
        // If there are chats and no chat is currently selected, select the first one.
        if (res.data.length > 0 && selectedChatId === null) {
          setSelectedChatId(res.data[0]._id);
        }
      })
      .catch(error => {
        // ADDED: Detailed error logging for debugging.
        console.error("Error fetching chat data in utility:", error);
        setChatsData([]); // Ensure state is reset on error
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // The eslint-disable-next-line comment is kept as it was in your original snippet,
    // indicating you're aware of the dependency array but have a reason for not including all.
    // In a production app, you might consider if `selectedChatId` should be in dependencies here.
  }, []);

  // Return the state and setters for use in components.
  return { selectedChatId, setSelectedChatId, selectedChat, chatsData };
}
