import { type FormEvent, useRef, useState, type ChangeEvent } from "react";
import { type RealtimeResponse } from "~/types/SocketTypes";

import Image from 'next/image';

import logo from 'public/ttt-transparent.png';

const DEFAULT_TEXT = 'Enter a nickname...';

const NickInputComponent: React.FC<NickInputProps> = ({ setUsername }) => {
  const usernameRef = useRef<string>();
  const [validation, setValidation] = useState({ valid: false, message: "", showMessage: false});
  
  // The reason showValidation and setValid exist separately is because we don't want to show an error message when they first 
  // start typing (< 3 chars) but we do for all other cases. Could refactor this to be cleaner.
  const validateUsername = (fromFocus: boolean) => {
    const usernameInputValue = usernameRef.current;
    if (usernameInputValue === undefined) return;

    if (usernameInputValue.length >= 16) {
      setValidation({ valid: false, message: "Nicknames must be less than 16 characters long", showMessage: true })
      return false;
    } else if (usernameInputValue.length <= 2) {
      setValidation({ valid: false, message: "Nicknames be at least 3 characters long", showMessage: fromFocus })
      return false;
    } else {
      setValidation({ valid: true, message: "", showMessage: false })
      return true;
    }
  };

  const handleUsernameSubmit = (ev: FormEvent) => {
    ev.preventDefault();
    if (!validateUsername(true)) return;

    const username = usernameRef.current.trim();
    if (username && username !== DEFAULT_TEXT) {
      setUsername(username, (res: RealtimeResponse) => {
        if (res.code !== 200) {
          setValidation({ valid: false, message: res.message, showMessage: true })
        }
      });
    }
  };

  const usernameInputChanged = (ev: ChangeEvent<HTMLInputElement>) => {
    usernameRef.current = ev.target.value;
    validateUsername(false);
  };

  return (
    <>
      <div className="flex flex-col items-center align-middle py-10">
        <div className="flex mb-2">
          <h2 className="text-2xl font-semibold mt-10 mr-2">Choose a Nickname</h2>
          <Image src={logo} alt="Tic Tac Yo Logo" className="square" width={100}/>
        </div>

        <form onSubmit={handleUsernameSubmit}>
          <input
            className={`bg-slate-800 ring-1 ${ validation.valid ? 'ring-blue-500' : 'ring-red-500'} mr-4 p-2`}
            defaultValue={DEFAULT_TEXT}
            autoFocus
            onChange={usernameInputChanged}
            onFocus={(e) => { if (e.target.value === DEFAULT_TEXT) e.target.value = ""}}
            onBlur={(e) => { 
              validateUsername(true);
              if (e.target.value.trim() === '') e.target.value = DEFAULT_TEXT;
            }} />
          <button className={`${validation.valid ? 'bg-blue-500' : 'bg-gray-600'} ${validation.valid ? 'hover:bg-blue-700' : ''} text-white font-bold py-2 px-4 rounded`} type="submit">Play</button>
        </form>

        { validation.showMessage && <h2 className="text-red-500 mt-2 font-2xl p-5">{validation.message}</h2>}
      </div>
    </>
  );
}

type NickInputProps = {
  setUsername: (username: string, callback: (response: RealtimeResponse) => void) => void;
};

export default NickInputComponent;
