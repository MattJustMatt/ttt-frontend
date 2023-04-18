
import { getColorClassForPiece } from "~/lib/utils";
import InteractiveBoard from "./InteractiveBoardComponent";
import { BoardPiece, type Board, type Game } from "~/types/GameTypes";
import { useEffect, useState } from "react";

const NEXT_GAME_DELAY = 15;

const MultiBoardComponent: React.FC<MultiBoardProps> = ({ game, boards, playingFor, playerInputAllowed, handleSquareClicked }) => {
  const [nextGameCountdown, setNextGameCountdown] = useState(NEXT_GAME_DELAY);

  useEffect(() => {
    const glowContainers = document.querySelectorAll('.glow-container');
  
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const containerWidth = entry.contentRect.width;
        const containerHeight = entry.contentRect.height;
        const glowContainer = entry.target as HTMLElement;
  
        glowContainer.style.setProperty('--glow-container-width', `${containerWidth}px`);
        glowContainer.style.setProperty('--glow-container-height', `${containerHeight}px`);
      }
    });
  
    glowContainers.forEach((glowContainer) => {
      resizeObserver.observe(glowContainer);
    });

    return () => {
      resizeObserver.disconnect();
    };
  }, [boards]);

  useEffect(() => {
    let countdownTimer: unknown;

    if (game.winner !== null) {
      countdownTimer = setInterval(() => {
        setNextGameCountdown((prevCountdown) => {
          if (prevCountdown === 1) clearInterval(countdownTimer as number);
  
          return prevCountdown-1;
        });
      }, 1000);
    }

    return () => {
      setNextGameCountdown(NEXT_GAME_DELAY);
      if (countdownTimer) clearInterval(countdownTimer as number);
    }
  }, [game.winner]);

  return (
    <>
      { game.winner !== null &&
        <div className={`m-10 p-10 text-slate-200 shadow-2xl font-semibold text-center ${getColorClassForPiece(game.winner, true)}`}>
          <h2 className="text-5xl">{ game.winner === BoardPiece.DRAW ? 'NOBODY' : game.winner === BoardPiece.X ? 'X' : 'O'} WINS!</h2>
          <h3 className="text-3xl mt-2">The {game.winner === BoardPiece.DRAW ? 'last' : 'winning'} move was made by <span className="font-extrabold">{game.winnerUsername}</span></h3>
          <p>The next game will start in {nextGameCountdown}s</p>
        </div>
      }

      <div className={`grid grid-rows-3 grid-cols-3 gap-3 shadow-lg ${ game.winner ? `opacity-0 transition-opacity duration-[5000ms] delay-[10000ms]` : ''} `}>
        { Array.from(boards).map((board) =>
          <InteractiveBoard 
            key={board.id}
            game={game}
            board={board}
            playingFor={playingFor}
            handleSquareClicked={handleSquareClicked}
            playerInputAllowed={playerInputAllowed}
          />
        )}
      </div>
    </>
  );
};

type MultiBoardProps = {
  game: Game;
  playingFor: BoardPiece;
  boards: Array<Board>;
  playerInputAllowed: boolean;
  handleSquareClicked(boardId: number, squareId: number): void;
};

export default MultiBoardComponent;