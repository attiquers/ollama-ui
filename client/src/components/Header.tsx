import { useState } from 'react';
import axios from 'axios';

interface HeaderProps {
  selectedLLM: string;
  setSelectedLLM: (llm: string) => void;
  llms: string[];
}

// Define the base API URL using Vite's environment variable.
// This variable will be set by Docker Compose during the build process.
// The fallback is for local development outside Docker.
const API_BASE_URL = import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:5000/api';

export default function Header({ selectedLLM, setSelectedLLM, llms }: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="w-full  px-8 pl-20 flex items-center justify-between">
      <div className="relative select-none w-56 justify-evenly">
        <button
          className="flex items-center gap-2 text-lg font-semibold text-[#E0E0E0] focus:outline-none rounded-lg px-3 py-1 transition-colors hover:cursor-pointer hover:bg-[#333333] group"
          onClick={() => setDropdownOpen((open) => !open)}
          aria-label="Select LLM"
        >
          <span className="transition-colors duration-200 group-hover:text-[#F0F0F0]">
            {selectedLLM || 'Select local LLM'}
          </span>
          <span className="rounded-md transition-colors duration-200 group-hover:bg-[#333333] flex items-center">
            <svg className="w-5 h-5 ml-1 text-[#E0E0E0] group-hover:text-[#F0F0F0]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </button>
        {dropdownOpen && (
          <ul className="absolute left-0 mt-2 rounded-2xl px-1 py-2 w-48 bg-[#282828] border border-[#444444] shadow-2xl">
            {llms.map((llm) => (
              <li
                key={llm}
                className={`px-4 py-2 hover:bg-[#3A3A3A] rounded-xl cursor-pointer text-[#E0E0E0] border-b border-[#3D3D3D] last:border-b-0 ${selectedLLM === llm ? 'font-semibold bg-[#3A3A3A]' : ''}`}
                onClick={async () => {
                  setSelectedLLM(llm);
                  setDropdownOpen(false);
                  try {
                    // CHANGED: Use API_BASE_URL for API calls
                    await axios.post(`${API_BASE_URL}/ollama/start`, { model: llm });
                  } catch (err) {
                    alert('Failed to start Ollama model.'); // Note: alert() is generally discouraged for better UX
                  }
                }}
              >
                {llm}
              </li>
            ))}
          </ul>
        )}
      </div>
    </header>
  );
}
