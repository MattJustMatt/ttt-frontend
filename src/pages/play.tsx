import { type NextPage } from "next";
import Head from "next/head";
import { type Reducer, useEffect, useReducer, useRef, useState, useCallback, useMemo } from "react";
import useSound from 'use-sound';

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

import emoteList from '~/lib/emoteList';
import GameHeaderComponent from "~/components/GameHeaderComponent";
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
  const [playerUuid, setPlayerUuid] = useState<string | null>(null);
  
  const [nextPiece, setNextPiece] = useState<BoardPiece>();
  const [games, setGames] = useState<Array<Game>>([]);
  const [boards, dispatchBoards] = useReducer<Reducer<Map<number, Board>, BoardAction>>(boardsReducer, new Map());

  const [playerList, setPlayerList] = useState<Array<SanitizedPlayer>>([]);
  const [showEmoteDrawer, setShowEmoteDrawer] = useState(false);
  const [allowedToSendEmote, setAllowedToSendEmote] = useState(true);
  const [username, setUsername] = useState<string | null>(null);

  const [loadAnimationCompleted, setLoadAnimationCompleted] = useState(false);
  const [uiOpacity, setUIOpacity] = useState(0);
  const [screenSize, setScreenSize] = useState({width: 1920, height: 1080});

  const [playingFor, setPlayingFor] = useState<BoardPiece>(null);

  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents>>();
  const [connected, setConnected] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const [playClickSFX] = useSound("click-on.mp3", { volume: 0.3});

  let playerInputAllowed = playingFor === nextPiece;
  if (games[games.length-1]?.winner !== null) playerInputAllowed = false;

  const memoizedBoards = useMemo(() => Array.from(boards.values()), [boards]);

  useEffect(() => {
    const localStorageUsername = localStorage.getItem("username");
    setUsername(localStorageUsername); // This will be reset later if the server rejects the localStorage username
    const authMessage = !!localStorageUsername ? { username: localStorageUsername } : {};

    socketRef.current = io(REMOTE_GAMEPLAY_URL, { transports: ["websocket"], auth: authMessage});

    socketRef.current.on("connect", () => {
      socketRef.current.sendBuffer = [];
      
      setConnected(true);
      setConnectError(null);
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
      setPlayerUuid(playerId);
      setUsername(username);
      setPlayingFor(playingFor);
    });

    socketRef.current.on('playerList', (playerList) => {
      setPlayerList(playerList);
    });

    socketRef.current.on('update', (gameId: number, boardId: number, squareId: number, updatedPiece: BoardPiece) => {
      setNextPiece(updatedPiece === BoardPiece.X ? BoardPiece. O : BoardPiece.X);
      dispatchBoards({ type: 'update_square', boardId: boardId, position: squareId, newPlayer: updatedPiece});
    });

    socketRef.current.on('end', (gameId, boardId, winner, winningLine, winnerUsername) => {
      if (boardId !== null) {
        dispatchBoards({ type: 'end_board', boardId: boardId, winner: winner, winningLine: winningLine});
      } else {
        // If there was no boardId included, that means the full game is over (a winning line was found in the broader board set)!
        setGames((prevGames) => {
          const gamesClone = prevGames.slice();
          gamesClone[gamesClone.length - 1].winner = winner;
          gamesClone[gamesClone.length - 1].winningLine = winningLine;
          gamesClone[gamesClone.length - 1].winnerUsername = winnerUsername;
  
          return gamesClone;
        });
      }
    });
  }, []);

  // Keep our socket auth username in sync with any username changes for reconnections
  useEffect(() => {
    if (username !== null) {
      socketRef.current.auth = { username: username };
    }
  }, [username]);

  // Updated window size is used to scale win confetti
  useEffect(() => {
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

  // Darken the background when they're signed out, and fade it in when they sign in.
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const brightBG = document.querySelector('.background-overlay') as HTMLElement;

    if (username) {
      fadeElement(brightBG, 1000, 1, 0);

      setTimeout(() => {
        setLoadAnimationCompleted(true);

        setTimeout(() => {
          setUIOpacity(1);
        }, 100);
      }, 100);
    } else if (uiOpacity !== 0) {
      setLoadAnimationCompleted(false)
      setUIOpacity(0);
      fadeElement(brightBG, 500, 0, 1);
    }
  }, [username]); // Not including uiOpacity is a hack to prevent the animation from re-running. Should be fixed

  const handleSquareClicked = useCallback((boardId: number, squareId: number) => {
    if (!playerInputAllowed) return;

    playClickSFX();

    socketRef.current.emit('clientUpdate', games.length-1, boardId, squareId, nextPiece);
  }, [games.length, nextPiece, playerInputAllowed, playClickSFX]);

  const handleSetUsername = useCallback((username: string, callback: (response: RealtimeResponse) => void) => {
    socketRef.current.emit('requestUsername', username, (response: RealtimeResponse) => {
      if (response.code !== 200) {
        callback(response);
        return;
      }

      localStorage.setItem('username', username);
      setUsername(username);
    });
  }, []);

  const handleSendEmote = useCallback((emote: Emote) => {
    if (allowedToSendEmote) {
      setShowEmoteDrawer(false);
      setAllowedToSendEmote(false);
      setTimeout(() => {
        setAllowedToSendEmote(true);
      }, 4000);
      socketRef.current.emit('emote', emote.slug);
    }
  }, [allowedToSendEmote]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("username");
    setUsername(null);
  }, []);

  const handleHowToPlay = useCallback(() => {
    alert("no one really knows");
  }, []);

  const handleShowEmoteDrawerClicked = useCallback(() => {
    setShowEmoteDrawer(!showEmoteDrawer);
  }, [showEmoteDrawer]);

  return (
    <>
      <Head>
        <title>Tic Tac YOOO - Beta</title>
        <meta name="description" content="Experience Tic Tac Toe like never before. 3x3x9 Multiplayer Tic Tac Toe" />
        <meta name="keywords" content="Tic Tac Toe, multiplayer, realtime, online, game, viewing experience" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
    
      <main className="text-slate-200">
        <div className="background-overlay"></div>

        {!connected && 
          <LoaderComponent connectError={connectError} />
        }       
        {connected && username === null &&
          <NickInputComponent setUsername={handleSetUsername} />
        }
        {connected && username && loadAnimationCompleted && <>
          <div className={`${uiOpacity === 1 ? 'opacity-100' : 'opacity-0'} transition-opacity duration-1000`}>
            {games[games.length-1]?.winner !== null && <Confetti width={screenSize.width-25} height={screenSize.height-5} />}
            <GameHeaderComponent playingFor={playingFor} nextPiece={nextPiece} playerInputAllowed={playerInputAllowed}/>

            <div className="m-2 md:m-5 flex flex-col md:flex-row justify-center">
              <div className="aspect-square max-w-screen max-h-screen md:min-w-0 md:min-h-[75vh] md:max-w-[75vw] md:mr-5">
                { games.map((game, index) => {
                  return <MultiBoardComponent key={index} game={game} boards={memoizedBoards} playingFor={playingFor} playerInputAllowed={playerInputAllowed} handleSquareClicked={handleSquareClicked} />
                })}
              </div>

              <div className="mt-5 min-w-full md:mt-0 md:min-w-0 md:max-w-xs">
                <div className="flex gap-3">
                  <button className={`bg-blue-500 hover:bg-blue-700 font-bold py-2 px-4 rounded`} onClick={ handleHowToPlay }>How to Play</button>
                  <button className={`bg-blue-500 hover:bg-blue-700 font-bold py-2 px-4 rounded`} onClick={ handleLogout }>Change Nickname</button>

                  <button className={`bg-purple-500 hover:bg-purple-700 font-bold py-2 px-4 rounded`} onClick={handleShowEmoteDrawerClicked}>Emotes</button>
                </div>
                
                {showEmoteDrawer && <EmoteDrawerComponent emoteList={emoteList} sendEmote={handleSendEmote} allowedToSendEmote={allowedToSendEmote}/>}
                <PlayerListComponent players={playerList} emoteList={emoteList} selfUuid={playerUuid} maxDisplayedPlayers={30} socketRef={socketRef}/>
              </div>
            </div>
          </div></>
        }
      </main>
    </>
  )  
}

export default Play;