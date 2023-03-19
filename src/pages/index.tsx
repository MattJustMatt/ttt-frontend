/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { type NextPage } from "next";
import Head from "next/head";
import { io, Socket } from 'socket.io-client';

import { useRef, useEffect, useState } from "react";

type ServerToClientEvents = {
  gameCreated: (data: { id: number }) => void;
  gameUpdated: (gameData: {id: number, position: Array<number>}) => void;
  gameEnded: (gameEndData: {id: number, winner: number}) => void;
}

type ClientToServerEvents = {
  ping: () => void;
}

const Home: NextPage = () => {
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);

  const [tps, setTPS] = useState("0");
  const totalUpdatesRef = useRef(0);

  const maxGamesRef = useRef(75);
  const [statistics, setStatistics] = useState({ xWins: 0, oWins: 0, ties: 0});

  const [boards, setBoards] = useState(new Map())

  useEffect(() => {
    document.body.style.background = "#00101e";
    socketRef.current = io('http://localhost:3001');

    const timer = setInterval(() => {
      setTPS(formatNumberWithCommas(totalUpdatesRef.current));
      totalUpdatesRef.current = 0;

      socketRef.current?.emit('ping');
    }, 1000);

    socketRef.current?.on('gameCreated', (gameData) => {
        setBoards(prevBoards => {
          if (prevBoards.size <= maxGamesRef.current) {
            // Create a new Map to ensure state immutability
            const updatedBoards = new Map(prevBoards);
            
            // Add the new board to the Map using the id as the key
            updatedBoards.set(gameData.id, gameData);
            
            // Return the updated Map
            return updatedBoards;
          }

          return prevBoards;
        });
    });

    socketRef.current?.on('gameUpdated', (gameData) => {
      totalUpdatesRef.current = totalUpdatesRef.current + 1;

      setBoards(prevBoards => {
        if (prevBoards.has(gameData.id)) {
          const updatedBoards = new Map(prevBoards); 
          updatedBoards.set(gameData.id, gameData);

          return updatedBoards;
        }

        return prevBoards;
      })
    });
   
    socketRef.current?.on('gameEnded', (gameEndData) => {
      console.log(`Game ended ${gameEndData.id}`)

      setStatistics((prevStatistics) => {
        let newStatistics = { ...prevStatistics };

        if (gameEndData.winner === 0) newStatistics.ties = prevStatistics.ties + 1;
        if (gameEndData.winner === 1) newStatistics.xWins = prevStatistics.xWins + 1;
        if (gameEndData.winner === 2) newStatistics.oWins = prevStatistics.oWins + 1;

        return newStatistics;
      });

      setBoards(prevBoards => {
        if (prevBoards.has(gameEndData.id)) {
          const updatedBoards = new Map(prevBoards); 
          updatedBoards.delete(gameEndData.id);
          return updatedBoards;
        }

        return prevBoards;
      })
    });

    return () => {
      clearTimeout(timer);
      socketRef.current?.disconnect();
    }
  }, []);


  const renderBoards = () => {
    return Array.from(boards.values()).reverse().map((board) => {
      return <Board key={board.id} positions={board.positions}/>
    });
  };

  return (
    <>
      <Head>
        <title>Tic Tac YOOO</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <div className="flex flex-row justify-center p-2 sm:p-0 space-x-1 sm:space-x-5 align-middle min-h-full text-gray-0 bg-blue-300 text-md sm:text-lg md:text-2xl">
          <p>TPS: <span className="font-bold">{tps}</span></p>
          <p className="text-orange-700">X Wins: <span className="text-black font-bold">{ statistics.xWins }</span></p>
          <p className="text-green-700">O Wins: <span className="text-black font-bold">{ statistics.oWins }</span></p>
          <p className="text-gray-500">Ties: <span className="text-black font-bold">{ statistics.ties }</span></p>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-12 gap-4 m-5">
          {renderBoards()}
        </div>
      </main>
    </>
  );
};

const Board: React.FC<BoardProps> = ({ positions }) => {
  const getWinningSquares = () => {
    const winningLines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
  
    for (const line of winningLines) {
      if (positions[line[0]] && positions[line[0]] === positions[line[1]] && positions[line[0]] === positions[line[2]]) {
        return line;
      }
    }
  
    return [];
  }

  const winningSquares = getWinningSquares();

  return (
    <>
      <div className="bg-gray-800 grid grid-cols-3 grid-rows-3 text-center font-bold sm:text-sm md:text-2xl aspect-square">
        {Array.from({ length: 9 }).map((_, index) => (
          <Square
            key={index}
            isWinningLine={winningSquares.includes(index)}
            playerAtPosition={positions[index]}
          />
        ))}
      </div>
    </>
  )
}


const Square: React.FC<SquareProps> = ( {playerAtPosition, isWinningLine }) => {
  let playerAtPositionString = '';
  let style = "flex flex-col justify-center border shadow-xl";

  switch (playerAtPosition) {
    case 1: {
      playerAtPositionString = "X";
      if (isWinningLine) style = style + " bg-orange-500";
      if (!isWinningLine) style = style + " bg-orange-200";
      break;
    }
    case 2: {
      playerAtPositionString = "O";
      if (isWinningLine) style = style + " bg-green-500";
      if (!isWinningLine) style = style + " bg-green-200";
      
      break;
    }
  }

  return (
    <>
      <div className={style}>{playerAtPositionString}</div>
    </>
  )
}

function formatNumberWithCommas(num: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(num);
}

type BoardProps = {
  positions: Array<number>
};

type SquareProps = {
  playerAtPosition: number,
  isWinningLine: boolean
};

export default Home;
