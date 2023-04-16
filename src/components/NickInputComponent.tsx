import { type FormEvent, useRef, useState, type ChangeEvent } from "react";
import { type RealtimeResponse } from "~/types/SocketTypes";

import Image from 'next/image';

import logo from 'public/ttt-transparent.png';

const DEFAULT_TEXT = 'Enter a nickname...';

const NickInputComponent: React.FC<NickInputProps> = ({ setUsername }) => {
  const usernameRef = useRef<string>();
  const [valid, setValid] = useState(true);
  const [validationMessage, setValidationMessage] = useState("");

  const [showValidation, setShowValidation] = useState(false);
  
  // The reason showValidation and setValid exist separately is because we don't want to show an error message when they first 
  // start typing (< 3 chars) but we do for all other cases. Could refactor this to be cleaner.
  const validateUsername = (fromFocus: boolean) => {
    const usernameInputValue = usernameRef.current;
    if (!usernameInputValue) return;

    if (usernameInputValue !== DEFAULT_TEXT) {
      if (usernameInputValue.length >= 16) {
        setValid(false);
        setValidationMessage("Nicknames must be less than 16 characters long");
        setShowValidation(true);
      } else if (usernameInputValue.length <= 2) {
        setValid(false);
        setValidationMessage("Nicknames must be at least 3 characters long");
        setShowValidation(fromFocus);
      } else {
        setValid(true);
        setShowValidation(false);
      }
    }
  }

  const handleUsernameSubmit = (ev: FormEvent) => {
    ev.preventDefault();
    if (!valid) return;

    const username = usernameRef.current.trim();
    
    if (username && username !== DEFAULT_TEXT) {
      setUsername(username, (res: RealtimeResponse) => {
        if (res.code !== 200) {
          setValid(false);
          setShowValidation(true);
          setValidationMessage(res.message);
        }
      });
    }
  }

  const usernameInputChanged = (ev: ChangeEvent<HTMLInputElement>) => {
    usernameRef.current = ev.target.value;
    validateUsername(false);
  }

  return (
    <>
      <div className="flex flex-col items-center align-middle py-10">
        <div className="flex mb-2">
          <h2 className="text-2xl font-semibold mt-10 mr-2">Choose a Nickname</h2>
          <Image src={logo} alt="Tic Tac Yo Logo" className="square" width={100}/>
        </div>

        <form onSubmit={handleUsernameSubmit}>
          <input
            className={`bg-slate-800 ring-1 ${ valid ? 'ring-blue-500' : 'ring-red-500'} mr-4 p-2`}
            defaultValue={DEFAULT_TEXT}
            autoFocus
            onChange={usernameInputChanged}
            onFocus={(e) => { if (e.target.value === DEFAULT_TEXT) e.target.value = ""}}
            onBlur={(e) => { 
              if (e.target.value.trim() === '')  e.target.value = DEFAULT_TEXT;
              validateUsername(true);
            }} />
          <button className={`${valid ? 'bg-blue-500' : 'bg-gray-600'} ${valid ? 'hover:bg-blue-700' : ''} text-white font-bold py-2 px-4 rounded`} type="submit">Play</button>
        </form>

        { showValidation && <h2 className="text-red-500 font-2xl">{validationMessage}</h2>}
      </div>
    </>
  );
}

type NickInputProps = {
  setUsername: (username: string, callback: (response: RealtimeResponse) => void) => void;
};

export default NickInputComponent;
