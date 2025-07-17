import { useState } from 'react';

interface HeaderProps {
  selectedLLM: string;
  setSelectedLLM: (llm: string) => void;
  llms: string[];
}

export default function Header({ selectedLLM, setSelectedLLM, llms }: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="w-full bg-gray-800 px-8 pl-20 flex items-center justify-between ">
      <div className="relative select-none  w-56 justify-evenly">
        <button
          className="flex items-center gap-2 text-lg font-semibold text-white focus:outline-none rounded-lg px-3 py-1 transition-colors hover:cursor-pointer hover:bg-[#232f45] hover:text-white group"
          onClick={() => setDropdownOpen((open) => !open)}
          aria-label="Select LLM"
        >
          <span className="transition-colors duration-200 group-hover:text-white">
            {selectedLLM || 'Select local LLM'}
          </span>
          <span className="rounded-md transition-colors duration-200 group-hover:bg-[#232f45] flex items-center">
            <svg className="w-5 h-5 ml-1 text-white group-hover:text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </button>
        {dropdownOpen && (
          <ul className="absolute left-0 mt-2 rounded-2xl px-1 py-2 w-48 bg-[#101828] border border-gray-700 shadow-2xl">
            {llms.map((llm) => (
              <li
                key={llm}
                className={`px-4 py-2 hover:bg-gray-700 rounded-xl cursor-pointer text-white border-b border-gray-800 last:border-b-0 ${selectedLLM === llm ? 'font-semibold bg-gray-700' : ''}`}
                onClick={() => {
                  setSelectedLLM(llm);
                  setDropdownOpen(false);
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
