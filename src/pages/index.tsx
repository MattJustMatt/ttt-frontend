import { type NextPage } from "next";
import Head from "next/head";
import { useRouter } from 'next/router';
import Image from 'next/image'

import BoardComponent from '~/components/BoardComponent';

import boardsReducer from "~/reducers/boardsReducer";

import { useRef, useEffect, useReducer, useState, useCallback } from "react";
import TTTRealtimeSocket from "~/lib/TTTRealtimeSocket";
import { type Board } from "~/types/GameTypes";
import { getCurrentDimension } from "~/lib/utils";

import logo from 'public/ttt-logo.jpg';

const REMOTE_WS_URL = process.env.NEXT_PUBLIC_REMOTE_WS_URL;

const Home: NextPage = () => {
  const router = useRouter();
  const [showModal, setShowModal] = useState(true);
  
  const realtimeSocketRef = useRef<TTTRealtimeSocket>();
  const totalUpdatesRef = useRef(0);
  const maxBoardsRef = useRef(5);

  const endedGames = useRef([]);

  const [boards, dispatchBoards] = useReducer(boardsReducer, new Map());

  const handleGameCreated = (gameId: number) => {
    totalUpdatesRef.current = totalUpdatesRef.current + 1;
  
    dispatchBoards({ type: 'create', boardId: gameId, maxBoards: maxBoardsRef.current });
  };

  const handleGameUpdated = (gameId: number, position: number, newPlayer: number) => {
    totalUpdatesRef.current = totalUpdatesRef.current + 1;
  
    if (endedGames.current.includes(gameId)) {
      console.error(`Received update for ended game ${gameId}`);
      return;
    }
  
    dispatchBoards({ type: 'update_square', boardId: gameId, position: position, newPlayer: newPlayer });
  };

  const handleGameEnded = (gameId: number, winner: number, winningLine: Array<number>) => {
    totalUpdatesRef.current = totalUpdatesRef.current + 1;

    dispatchBoards({ type: 'end_board', boardId: gameId, winner: winner, winningLine: winningLine });
  }

  // Initial setup
  useEffect(() => {
    document.body.classList.add("signed-in");

    realtimeSocketRef.current = new TTTRealtimeSocket(REMOTE_WS_URL, handleGameCreated, handleGameUpdated, handleGameEnded, () => { return null; });

    realtimeSocketRef.current.onConnected = () => {
      console.log("[REALTIME] Connected");
    }
    realtimeSocketRef.current.connect();

    realtimeSocketRef.current.onDisconnected = () => {
      console.log("[REALTIME] Disconnected");

      dispatchBoards({ type: 'reset' });
    };

    const handleResize = () => {
      const size = getCurrentDimension();

      if (size.width < 600) {
        maxBoardsRef.current = 15;
      } else if (size.width <= 1024) {
        maxBoardsRef.current = 35;
      } else if (size.width < 1300) {
        maxBoardsRef.current = 60;
      } else {
        maxBoardsRef.current = 80;
      }
    }

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      realtimeSocketRef.current.disconnect();
      document.body.classList.remove("signed-in");
    };
  }, []);

  const handleLeave = useCallback(() => {
    setShowModal(false);

    void router.push("/play");
  }, [router]);

  const handleStay = useCallback(() => {
    setShowModal(false);
  }, []);

  return (
    <>
      <Head>
        <title>Tic Tac YOOO</title>
        <meta name="description" content="Experience Tic Tac Toe like never before. Join the realtime online multiplayer viewing experience and enjoy watching games unfold live!" />
        <meta name="keywords" content="Tic Tac Toe, multiplayer, realtime, online, game, viewing experience" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <div className={`grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-12 gap-4 m-5 filter ${showModal ? 'blur-sm' : ''}`}>
          { Array.from(boards.values()).map((board: Board) => {
            return <BoardComponent key={board.id} positions={board.positions} ended={board.winner !== null} winningLine={board.winningLine} />
          }) }
        </div>

        {showModal && 
          <div className="fixed inset-0 z-50 flex items-center justify-center w-full h-full max-w-screen max-h-screen p-4 overflow-x-hidden overflow-y-auto">
            <div className="relative w-auto max-w-lg max-h-full">
              <div className="relative bg-white rounded-lg shadow overflow-auto dark:bg-gray-700">
                <div className="flex items-center justify-between p-5 border-b rounded-t dark:border-gray-600">
                  <h3 className="text-2xl font-bold  text-gray-900 dark:text-white">
                      Stop Watching... Start Playing
                  </h3>
                  <Image className="hover:animate-bounce rounded-lg w-16 sm:w-20" src={logo} alt="Tic Tac Yo Logo" width={75}/>
                </div>
                <div className="p-6 space-y-6 text-lg">
                  <p className="leading-relaxed text-gray-600 dark:text-gray-400">
                    We heard your feedback- <span className="font-bold">watching TicTacToe is boring!</span> 
                  </p>
                  <p className="leading-relaxed text-gray-600 dark:text-gray-400">
                    So, we spent the last 7 dog hours building a new experience. This time, you and up to 32,768 other people can play TicTacToe together. We call it TicTacYo and we can&apos;t wait to see what you think.
                  </p>
                  <p className="leading-relaxed text-gray-600 dark:text-gray-400">
                    If you&apos;re ready, click ahead to check out our next generation experience. Or, you can hang out here and watch some boards go by! 
                  </p>
                </div>
                <div className="flex items-center p-6 space-x-2 border-t border-gray-200 rounded-b dark:border-gray-600">
                  <button type="button" className="text-white bg-blue-500 hover:bg-blue-600 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800" onClick={handleLeave}>I Want The Future</button>
                  <button type="button" className="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-200 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-500 dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-gray-600" onClick={handleStay}>Stay Behind</button>
                </div>
              </div>
            </div>
          </div>}
      </main>
    </>
  );
};

export default Home;
