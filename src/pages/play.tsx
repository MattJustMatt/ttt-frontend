import { type NextPage } from "next";
import Head from "next/head";
import { type Reducer, useEffect, useReducer, useRef, useState, useCallback, useMemo } from "react";

import Confetti from "react-confetti";

import { type Socket, io} from 'socket.io-client';

import { BoardPiece, type Board, type Game, type SanitizedPlayer } from "~/types/GameTypes";
import { type RealtimeResponse } from "~/types/SocketTypes";

import boardsReducer, { type BoardAction } from "~/reducers/boardsReducer";
import MultiBoardComponent from "~/components/MultiBoardComponent";
import { getCurrentDimension } from "~/lib/utils";
import PlayerListComponent from "~/components/PlayerListComponent";
import NickInputComponent from "~/components/NickInputComponent";
import LoaderComponent from "~/components/LoaderComponent";

import useSound from 'use-sound';

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
    const [hasUsername, setHasUsername] = useState(false);

    const [loadAnimationCompleted, setLoadAnimationCompleted] = useState(false);
    const [uiOpacity, setUIOpacity] = useState(0);
    const [screenSize, setScreenSize] = useState({width: 1920, height: 1080});

    const [playingFor, setPlayingFor] = useState<BoardPiece>(null);

    const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents>>();
    const [connected, setConnected] = useState(false);
    const [connectError, setConnectError] = useState("");

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const [playClickOn] = useSound("click-on.mp3", { volume: 0.3});

    const playerInputAllowed = playingFor === nextPiece;

    const memoizedBoards = useMemo(() => Array.from(boards.values()), [boards]);

    useEffect(() => {
        const localUsername = localStorage.getItem("username");
        const auth = !!localUsername ? { username: localUsername } : {};

        socketRef.current = io(REMOTE_GAMEPLAY_URL, { 
            transports: ["websocket"], auth
        });

        console.log(auth);

        socketRef.current.on("connect", () => {

            socketRef.current.sendBuffer = [];
            setConnected(true);
            setConnectError("");

            dispatchBoards({type: 'reset'});
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

        socketRef.current.on('end', (gameId, boardId, winner, winningLine) => {
            if (boardId !== null) {
              dispatchBoards({ type: 'end_board', boardId: boardId, winner: winner, winningLine: winningLine});
              return;
            }
          
            // If there was no boardId included, that means the full game is over (a winning line was found in the broader boards)!
            setGames((prevGames) => {
              const gamesClone = prevGames.slice();
              if (gamesClone[gamesClone.length - 1]) {
                gamesClone[gamesClone.length - 1].winner = winner;
                gamesClone[gamesClone.length - 1].winningLine = winningLine;
              }
              return gamesClone;
            });

          });

        const updateDimension = () => {
            setScreenSize(getCurrentDimension())
        }

        window.addEventListener('resize', updateDimension);
        return () => {
            socketRef.current.disconnect();

            window.removeEventListener('resize', updateDimension);
        }
    }, []);

    // Sign in animation
    useEffect(() => {
        if (hasUsername) {
            document.body.classList.add("signed-in");

            setTimeout(() => {
                setLoadAnimationCompleted(true);
            }, 750);

            return;
        }
        
        document.body.classList.remove('signed-in');
    }, [ hasUsername ]);

    // Board loading animation
    useEffect(() => {
        if (loadAnimationCompleted) {
            setTimeout(() => {
                setUIOpacity(1);
            }, 100);
        }
    }, [loadAnimationCompleted]);

    const handleSetUsername = useCallback((username: string, callback: (RealtimeResponse) => void) => {
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

    return (
        <>
            <Head>
                <title>Tic Tac YOOO</title>
                <meta name="description" content="Experience Tic Tac Toe like never before. 3x3x3 Multiplayer Tic Tac Toe" />
                <meta name="keywords" content="Tic Tac Toe, multiplayer, realtime, online, game, viewing experience" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <main className="text-slate-200">
                {!connected && 
                    <LoaderComponent connectError={connectError} />
                }       
                {connected && !hasUsername && <>
                    <NickInputComponent setUsername={handleSetUsername} />
                </>
                }
                {connected && hasUsername && loadAnimationCompleted && <>
                    <div className={`${uiOpacity === 1 ? 'opacity-100' : 'opacity-0'} transition-opacity duration-1000`}>
                        {(games[games.length-1] && games[games.length-1].winner !== null) && <Confetti width={screenSize.width} height={screenSize.height} />}

                        <div className={`text-white text-center p-2 sm:p-0 space-x-1 sm:space-x-5 align-middle min-h-full ${playerInputAllowed ? 'bg-opacity-10' : 'bg-opacity-40'} transition-opacity duration-300 bg-slate-200 text-md sm:text-lg md:text-2xl shadow-2xl`}>
                            <div className="flex flex-wrap justify-center items-center">
                                <p>You&apos;re team: <span className={`font-bold ${playingFor === BoardPiece.X ? 'bg-orange-400' : 'bg-green-400'}`}>{playingFor === BoardPiece.X ? 'X' : 'O'}&apos;s</span></p>
                                
                                {playerInputAllowed && <span className="font-bold">&nbsp;make a move!</span>}
                                
                                {!playerInputAllowed && (
                                    <p className="whitespace-nowrap">&nbsp;but, it&apos;s team <span className={`font-bold ${nextPiece === BoardPiece.X ? 'bg-orange-400' : 'bg-green-400'}`}>{nextPiece === BoardPiece.X ? 'X' : 'O'}&apos;s</span> turn.</p>)}
                                
                                {!playerInputAllowed && (
                                    <p className="font-extrabold whitespace-normal sm:whitespace-nowrap">&nbsp;Invite a friend to continue!</p>
                                )}
                            </div>
                        </div>

                        <div className="m-2 md:m-5 flex justify-center flex-col xl:flex-row">
                            <div className="flex-grow justify-center max-w-4xl xl:mr-5">
                                { games.map((game, index) => {
                                    return <MultiBoardComponent key={index} game={game} boards={memoizedBoards} playingFor={playingFor} playerInputAllowed={playerInputAllowed} handleSquareClicked={handleSquareClicked} />
                                })}
                            </div>

                            <div>
                                <div className="flex justify-start mt-5 xl:mt-0 gap-3 xl:justify-around">
                                    <button className={`bg-blue-500 hover:bg-blue-700'text-white font-bold py-2 px-4 rounded`} onClick={ handleHowToPlay }>How to Play</button>
                                    <button className={`bg-blue-500 hover:bg-blue-700'text-white font-bold py-2 px-4 rounded`} onClick={ handleLogout }>Change Username</button>
                                </div>
                                <PlayerListComponent players={playerList} playerId={playerId} maxDisplayedPlayers={100} />
                            </div>
                            
                        </div>
                    </div>
                    </>
                }
            </main>
        </>
    )  
}

interface ServerToClientEvents {
    playerInformation: (id: number, username: string | null, playingFor: BoardPiece) => void;
    history: (gameHistory: Array<Game>) => void;
    playerList: (playerList: Array<SanitizedPlayer>) => void;
    update: (gameId: number, boardId: number, squareId: number, updatedPiece: BoardPiece) => void;
    end: (gameId: number, boardId: number | null, winner: BoardPiece, winningLine: Array<BoardPiece>) => void;
}

interface ClientToServerEvents {
    clientUpdate: (gameId: number, boardId: number, squareId: number, updatedPiece: BoardPiece) => void;
    requestUsername: (username: string) => void;
}


export default Play;