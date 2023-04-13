import { type NextPage } from "next";
import Head from "next/head";
import { type Reducer, useEffect, useReducer, useRef, useState, type MutableRefObject } from "react";

import Confetti from "react-confetti";

import { type Socket, io} from 'socket.io-client';

import boardsReducer, { type BoardAction } from "~/reducers/boardsReducer";
import MultiBoardComponent from "~/components/MultiBoardComponent";
import { BoardPiece, type Board, type Game } from "~/types/GameTypes";
import { getColorClassForPiece } from "~/lib/utils";
const REMOTE_GAMEPLAY_URL = process.env.NEXT_PUBLIC_REMOTE_GAMEPLAY_URL;

const Play: NextPage = () => {
    const nextPieceRef = useRef<BoardPiece>(BoardPiece.X);
    const usernameRef = useRef<HTMLInputElement>();
    const [playingFor, setPlayingFor] = useState<BoardPiece>(null);
    const [playerList, setPlayerList] = useState<Array<SanitizedPlayer>>([]);
    const [playerInputAllowed, setPlayerInputAllowed] = useState(true);
    const [playerId, setPlayerId] = useState<number | null>(null);
    const [games, setGames] = useState<Array<Game>>([]);
    const [boards, dispatchBoards] = useReducer<Reducer<Map<number, Board>, BoardAction>>(boardsReducer, new Map());

    const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents>>();

    useEffect(() => {
        socketRef.current = io(REMOTE_GAMEPLAY_URL);

        socketRef.current.on("connect", () => {
            dispatchBoards({type: 'reset'});
        });
          
        socketRef.current.on('history', (gameHistory) => {
            const gameHistoryClone = gameHistory.slice();

            setGames(gameHistoryClone);
            dispatchBoards({type: 'initialize', game: gameHistory[gameHistory.length-1]});
        });

        socketRef.current.on('playerInformation', (playerId, playingFor) => {
            setPlayerId(playerId);
            setPlayingFor(playingFor);
        });

        socketRef.current.on('playerList', (playerList) => {
            setPlayerList(playerList);
        });

        socketRef.current.on('update', (gameId: number, boardId: number, squareId: number, updatedPiece: BoardPiece) => {
            dispatchBoards({ type: 'update_square', boardId: boardId, position: squareId, newPlayer: updatedPiece});
        });

        socketRef.current.on('end', (gameId, boardId, winner, winningLine) => {
            console.log(`Received end for ${gameId} board id ${boardId}`);
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

        return () => {
            socketRef.current.disconnect();
        }
    }, []);

    const handleUsernameSubmit = () => {
        const username = usernameRef.current?.value.trim();
        if (username && username !== "Enter a username...") {
            socketRef.current.emit('requestUsername', username);
        } else {
            alert("Please enter a valid username.");
        }
    };

    const handleSquareClicked = (boardId: number, squareId: number) => {
        console.log(`Board ${boardId} square ${squareId} clicked`);
        if (!playerInputAllowed) return;

        const currentBoard = boards.get(boardId);
        if (currentBoard.winner) return;
        if (currentBoard.positions[squareId]) return;

        socketRef.current.emit('clientUpdate', games.length-1, boardId, squareId, nextPieceRef.current);
        nextPieceRef.current = 3 - nextPieceRef.current;

        //setPlayerInputAllowed(false);
    };

    return (
        <>
            <Head>

            </Head>
            <main>
                {games[games.length-1]?.winner !== null && <Confetti width={2000} height={1200} />}

                <div className={`text-white flex flex-row justify-center p-2 sm:p-0 space-x-1 sm:space-x-5 align-middle min-h-full bg-opacity-10 bg-slate-200 text-md sm:text-lg md:text-2xl shadow-2xl  transition-colors duration-200`}>
                    <p>You&apos;re playing for team: <span className={`font-bold ${playingFor === BoardPiece.X ? 'bg-orange-400' : 'bg-green-400'}`}>{playingFor === BoardPiece.X ? 'X' : 'O'}&apos;s</span></p>
                </div>
                <br />
                <div className="min-h-auto m-10 flex items-center justify-center text-slate-200">
                    <div className="bg-opacity-10 bg-slate-200 m-5 p-5 ring-orange-500 ring-4">
                        <div className="p-3">
                            <h2 className="text-3xl mb-5 font-semibold">Players</h2>
                            { playerList.map((player, index) => {
                                return <h2 className="text-xl" key={index}><span className={`${player.id === playerId ? 'font-extrabold' : ''}`}>{player.username}</span> <span className={`${ getColorClassForPiece(player.playingFor, true)} bg-opacity-50 font-extrabold`}>({player.playingFor === BoardPiece.X ? 'X' : 'O'}s)</span>: {player.score} pts</h2>
                            })}
                        </div>


                        <div className="p-3">
                            <h2 className="text-2xl font-semibold mt-10 mb-3">Choose a name</h2>
                            <input
                                className="bg-slate-800 ring-1 ring-green-500 mr-2 p-2"
                                defaultValue="Enter a username..."
                                ref={usernameRef}
                                onFocus={(e) => e.target.value === "Enter a username..." && (e.target.value = "")}
                            ></input>
                            <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onClick={handleUsernameSubmit}>Submit</button>
                        </div>
                    </div>
                    <div className="space-x-4 w-5/6 md:w-5/12 text-gray-900">
                        { games.map((game, index) => {
                            return <MultiBoardComponent key={index} game={game} boards={Array.from(boards.values())} handleSquareClicked={handleSquareClicked} />
                        })}
                    </div>
                </div>
            </main>
        </>
    )  
}

interface ServerToClientEvents {
    playerInformation: (id: number, playingFor: BoardPiece) => void;
    history: (gameHistory: Array<Game>) => void;
    playerList: (playerList: Array<SanitizedPlayer>) => void;
    update: (gameId: number, boardId: number, squareId: number, updatedPiece: BoardPiece) => void;
    end: (gameId: number, boardId: number | null, winner: BoardPiece, winningLine: Array<BoardPiece>) => void;
}

interface ClientToServerEvents {
    clientUpdate: (gameId: number, boardId: number, squareId: number, updatedPiece: BoardPiece) => void;
    requestUsername: (username: string) => void;
}

type SanitizedPlayer = {
    id: number;
    username: string;
    playingFor: BoardPiece;
    score: number;
}

export default Play;