import { type NextPage } from "next";
import Head from "next/head";
import { type Reducer, useEffect, useReducer, useRef, useState, useCallback, useMemo, KeyboardEvent } from "react";

import Confetti from "react-confetti";

import { type Socket, io} from 'socket.io-client';
import type { RealtimeResponse, ServerToClientEvents, ClientToServerEvents } from "~/types/SocketTypes";

import { BoardPiece, type Board, type Game, type SanitizedPlayer, type Emote } from "~/types/GameTypes";

import boardsReducer, { type BoardAction } from "~/reducers/boardsReducer";
import MultiBoardComponent from "~/components/MultiBoardComponent";
import PlayerListComponent from "~/components/PlayerListComponent";
import NickInputComponent from "~/components/NickInputComponent";
import LoaderComponent from "~/components/LoaderComponent";
import EmoteDrawerComponent from "~/components/EmoteDrawerComponent";

import { fadeElement, getCurrentDimension } from "~/lib/utils";

import useSound from 'use-sound';

import emoteList from '~/lib/emoteList';
const REMOTE_GAMEPLAY_URL = process.env.NEXT_PUBLIC_REMOTE_GAMEPLAY_URL;

type EmitCallback = (response: RealtimeResponse) => void;

// Extend the socket interface to include case where we want a callback'
// TODO: The "EmitCallback" function isn't being recognized :(
declare module "socket.io-client" {
  interface Socket {
    emit(event: string, ...args: (unknown | EmitCallback)[]): Socket;
  }
}

const Play: NextPage = () => {
  const [playerId, setPlayerId] = useState<number | null>(null);
  
  const [nextPiece, setNextPiece] = useState<BoardPiece>();
  const [games, setGames] = useState<Array<Game>>([]);
  const [boards, dispatchBoards] = useReducer<Reducer<Map<number, Board>, BoardAction>>(boardsReducer, new Map());

  const [playerList, setPlayerList] = useState<Array<SanitizedPlayer>>([]);
  const [showEmoteDrawer, setShowEmoteDrawer] = useState(false);
  const [allowedToSendEmote, setAllowedToSendEmote] = useState(true);
  const [hasUsername, setHasUsername] = useState(false);

  const [loadAnimationCompleted, setLoadAnimationCompleted] = useState(false);
  const [uiOpacity, setUIOpacity] = useState(0);
  const [screenSize, setScreenSize] = useState({width: 1920, height: 1080});

  const [playingFor, setPlayingFor] = useState<BoardPiece>(null);

  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents>>();
  const [connected, setConnected] = useState(false);
  const [connectError, setConnectError] = useState("");

  const keyPressesRef = useRef<Array<string>>([]);
  const [showKonami, setShowKonami] = useState(false);

  const [playClickOn] = useSound("click-on.mp3", { volume: 0.3});

  let playerInputAllowed = playingFor === nextPiece;
  if (games[games.length-1]?.winner !== null) playerInputAllowed = false;

  const memoizedBoards = useMemo(() => Array.from(boards.values()), [boards]);

  useEffect(() => {
    const localUsername = localStorage.getItem("username");
    setHasUsername(!!localUsername); // This will be reset later if the server rejects the localStorage username
    const authMessage = !!localUsername ? { username: localUsername } : {};

    socketRef.current = io(REMOTE_GAMEPLAY_URL, { 
      transports: ["websocket"], auth: authMessage
    });

    socketRef.current.on("connect", () => {
      socketRef.current.sendBuffer = [];
      
      setConnected(true);
      setConnectError("");
    });

    socketRef.current.on('disconnect', () => {
      setConnected(false);
    });

    socketRef.current.on('connect_error', (err) => {
      setConnected(false);
      setConnectError(err.message);
    });
      
    socketRef.current.on('history', (gameHistory) => {
      setNextPiece(gameHistory[gameHistory.length-1].nextPiece);
      setGames(gameHistory);

      dispatchBoards({type: 'reset'});
      dispatchBoards({type: 'initialize', game: gameHistory[gameHistory.length-1]});
    });

    socketRef.current.on('playerInformation', (playerId, username, playingFor) => {
      setPlayerId(playerId);
      setHasUsername(!!username);
      setPlayingFor(playingFor);
    });

    socketRef.current.on('playerList', (playerList) => {
      setPlayerList(playerList);
    });

    socketRef.current.on('update', (gameId: number, boardId: number, squareId: number, updatedPiece: BoardPiece) => {
      const nextPiece = updatedPiece === BoardPiece.X ? BoardPiece. O : BoardPiece.X
      setNextPiece(nextPiece);

      dispatchBoards({ type: 'update_square', boardId: boardId, position: squareId, newPlayer: updatedPiece});
    });

    socketRef.current.on('end', (gameId, boardId, winner, winningLine, winnerUsername) => {
      if (boardId !== null) {
        dispatchBoards({ type: 'end_board', boardId: boardId, winner: winner, winningLine: winningLine});
        return;
      }
    
      // If there was no boardId included, that means the full game is over (a winning line was found in the broader boards)!
      setGames((prevGames) => {
        const gamesClone = prevGames.slice();
        gamesClone[gamesClone.length - 1].winner = winner;
        gamesClone[gamesClone.length - 1].winningLine = winningLine;
        gamesClone[gamesClone.length - 1].winnerUsername = winnerUsername;

        return gamesClone;
      });
    });

    const updateDimension = () => {
      setScreenSize(getCurrentDimension())
    }

    updateDimension();
    window.addEventListener('resize', updateDimension);
    return () => {
      socketRef.current.disconnect();

      window.removeEventListener('resize', updateDimension);
    }
  }, []);

  // Konami code changes background :D
  useEffect(() => {
    const keyDownListener = (ev: globalThis.KeyboardEvent) => {
      const keyPresses = keyPressesRef.current
      if (keyPresses.length > 3) keyPresses.shift();
      keyPresses.push(ev.key)
      keyPressesRef.current = keyPresses;

      const word = keyPresses.join("");
      if (word === "suit") {
        setShowKonami(true);
      }
    };

    document.addEventListener('keydown', keyDownListener);

    return () => {
      document.removeEventListener('keydown', keyDownListener);
    }
  }, []);

  useEffect(() => {
    let konamiTimer: unknown;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const konamiBG = document.querySelector('.background-overlay') as HTMLElement;

    if (showKonami) {
      fadeElement(konamiBG, 400, 0, 1);

      konamiTimer = setTimeout(() => {
        setShowKonami(false);
      }, 3000);
    } else {
      fadeElement(konamiBG, 400, 1, 0);
    }

    return () => {
      if (konamiTimer) clearTimeout(konamiTimer as number);
    }
  }, [showKonami]);

  // Sign in animation
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const brightBG = document.querySelector('.background-overlay') as HTMLElement;

    if (hasUsername) {
      fadeElement(brightBG, 1000, 1, 0);

      setTimeout(() => {
        setLoadAnimationCompleted(true);
      }, 400);
    } else {
      setLoadAnimationCompleted(false)
      setUIOpacity(0);
      fadeElement(brightBG, 750, 0, 1);
    }
  }, [hasUsername]);

  // Board loading animation
  useEffect(() => {
    if (loadAnimationCompleted) {
      setTimeout(() => {
        setUIOpacity(1);
      }, 100);
    }
  }, [loadAnimationCompleted]);

  const handleSetUsername = useCallback((username: string, callback: (response: RealtimeResponse) => void) => {
    socketRef.current.emit('requestUsername', username, (response: RealtimeResponse) => {
      if (response.code !== 200) {
        callback(response);
        return;
      }

      localStorage.setItem('username', username);
      setHasUsername(true);
    });
  }, []);

  const handleSquareClicked = useCallback((boardId: number, squareId: number) => {
    if (!playerInputAllowed) return;

    playClickOn();

    const currentBoard = boards.get(boardId);
    if (currentBoard.winner) return;
    if (currentBoard.positions[squareId]) return;

    socketRef.current.emit('clientUpdate', games.length-1, boardId, squareId, nextPiece);
  }, [boards, games.length, nextPiece, playerInputAllowed, playClickOn]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("username");
    setHasUsername(false);
  }, []);

  const handleHowToPlay = useCallback(() => {
    alert("no one really knows");
  }, []);

  const handleShowEmoteDrawerClicked = useCallback(() => {
    setShowEmoteDrawer(!showEmoteDrawer);
  }, [showEmoteDrawer]);

  const sendEmote = useCallback((emote: Emote) => {
    if (allowedToSendEmote) {
      setShowEmoteDrawer(false);
      setAllowedToSendEmote(false);
      setTimeout(() => {
        setAllowedToSendEmote(true);
      }, 4000);
      socketRef.current.emit('emote', emote.slug);
    }
  }, [allowedToSendEmote]);

  return (
    <>
      <Head>
        <title>Tic Tac YOOO - Beta</title>
        <meta name="description" content="Experience Tic Tac Toe like never before. 3x3x3 Multiplayer Tic Tac Toe" />
        <meta name="keywords" content="Tic Tac Toe, multiplayer, realtime, online, game, viewing experience" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
    
      <main className="text-slate-200">
        <div className="background-overlay konami-overlay"></div>
        {!connected && 
          <LoaderComponent connectError={connectError} />
        }       
        {connected && !hasUsername &&
          <NickInputComponent setUsername={handleSetUsername} />
        }
        {connected && hasUsername && loadAnimationCompleted && <>
          <div className={`${uiOpacity === 1 ? 'opacity-100' : 'opacity-0'} transition-opacity duration-1000`}>
              {(games[games.length-1] && games[games.length-1].winner !== null) && <Confetti width={screenSize.width-25} height={screenSize.height-5} />}

              <div className={`text-white text-center p-2 sm:p-0 space-x-1 sm:space-x-5 align-middle min-h-full ${playerInputAllowed ? 'bg-opacity-10' : 'bg-opacity-40'} transition-opacity duration-300 bg-slate-200 text-md sm:text-lg md:text-2xl shadow-2xl`}>
                <div className="flex flex-wrap justify-center items-center">
                  <p>You&apos;re team: <span className={`font-bold ${playingFor === BoardPiece.X ? 'bg-orange-400' : 'bg-green-400'}`}>{playingFor === BoardPiece.X ? 'X' : 'O'}&apos;s</span></p>
                  
                  {playerInputAllowed && <span className="font-bold">&nbsp;make a move!</span>}
                  
                  {!playerInputAllowed && (<>
                    <p className="whitespace-nowrap">&nbsp;but, it&apos;s team <span className={`font-bold ${nextPiece === BoardPiece.X ? 'bg-orange-400' : 'bg-green-400'}`}>{nextPiece === BoardPiece.X ? 'X' : 'O'}&apos;s</span> turn.</p>
                  
                    <p className="font-extrabold whitespace-normal sm:whitespace-nowrap">&nbsp;Invite a friend to continue!</p>
                  </>)}
                </div>
              </div>

              <div className="m-2 md:m-5 flex justify-center flex-col xl:flex-row">
                <div className="flex-grow justify-center max-w-4xl xl:mr-5">
                  { games.map((game, index) => {
                    return <MultiBoardComponent key={index} game={game} boards={memoizedBoards} playingFor={playingFor} playerInputAllowed={playerInputAllowed} handleSquareClicked={handleSquareClicked} />
                  })}
                </div>

                <div className="max-w-4xl xl:max-w-xs grow">
                  <div className="flex justify-start mt-5 xl:mt-0 gap-3 xl:justify-around xl:flex-col">
                    <div className="flex-grow">
                      <button className={`bg-blue-500 hover:bg-blue-700 font-bold py-2 px-4 rounded xl:mr-7`} onClick={ handleHowToPlay }>How to Play</button>
                      <button className={`bg-blue-500 hover:bg-blue-700 font-bold py-2 px-4 rounded`} onClick={ handleLogout }>Change Nickname</button>
                    </div>

                    <button className={`bg-purple-500 hover:bg-purple-700 font-bold py-2 px-4 rounded`} onClick={handleShowEmoteDrawerClicked}>Emotes</button>
                  </div>
                  
                  {showEmoteDrawer && <EmoteDrawerComponent emoteList={emoteList} sendEmote={sendEmote} allowedToSendEmote={allowedToSendEmote}/>}
                  <PlayerListComponent players={playerList} emoteList={emoteList} playerId={playerId} maxDisplayedPlayers={100} socketRef={socketRef}/>
                </div>
              </div>
            </div></>
          }
      </main>
    </>
  )  
}

export default Play;