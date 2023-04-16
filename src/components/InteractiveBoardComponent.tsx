
import { BoardPiece, type Board, type Game } from '~/types/GameTypes';
import Square from './SquareComponent';
import { useEffect, useState } from 'react';

const InteractiveBoard: React.FC<BoardProps> = (({ game, board, playingFor, handleSquareClicked, playerInputAllowed }) => {
  const [playPingAnimation, setPlayPingAnimation] = useState(false);

  const ended = board.winner !== null;
  let winnerString = '';
  switch (board.winner) {
    case BoardPiece.X: {
      winnerString = 'X';
      break;
    }
    case BoardPiece.O: {
      winnerString = 'O';
      break;
    }
    case BoardPiece.DRAW: {
      winnerString = '-';
      break;
    }
  }

  const isPartOfWinningGameLine = game.winningLine?.includes(board.id);

  useEffect(() => {
    let delayTimer: unknown;
    let animationTimer: unknown;

    if (isPartOfWinningGameLine) {
      // TODO: This should be based on the board's index in the winning line
      const animationDelay = board.id*75;

      setTimeout(() => {
        setPlayPingAnimation(true);
  
        animationTimer = setTimeout(() => {
          setPlayPingAnimation(false);
        }, 1000);
      }, animationDelay);
    }

    return () => {
      clearTimeout(delayTimer as number);
      clearTimeout(animationTimer as number);
    }
  }, [isPartOfWinningGameLine, board.id]);

  return (
    <>
      <div className={`${playPingAnimation ? 'animate-ping-once' : ''} ${!ended && !isPartOfWinningGameLine ? 'glow-effect' : `${isPartOfWinningGameLine ? 'ring-8' : 'ring-4'} ${ board.winner === BoardPiece.X ? 'ring-orange-500' : board.winner === BoardPiece.O ? 'ring-green-500' : 'ring-gray-600'}`} relative`}>
        {ended && <h2 className={`absolute z-10 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-7xl font-extrabold text-white`}>{winnerString}</h2>}
        
        <div className={`${ended ? 'opacity-20 transition-opacity duration-300 delay-75' : ''}`}>
          <div className={`grid grid-cols-3 grid-rows-3 text-center font-bold sm:text-sm md:text-2xl aspect-square`}>
            {Array.from({ length: 9 }).map((_, index) => (
              <Square
                key={index}
                playingFor={playingFor}
                isWinning={board.winningLine?.includes(index)}
                pieceAtPosition={board.positions[index]}
                handleSquareClicked={() => { handleSquareClicked(board.id, index) }}
                playerInputAllowed={playerInputAllowed}
              />
            ))}
          </div>
        </div>

        {!ended && playerInputAllowed && <svg className="glow-container">
              <rect pathLength="100" className="glow-blur"></rect>
              <rect pathLength="100" className="glow-line"></rect>
          </svg>}
      </div>

    </>
  )
});

type BoardProps = {
  game: Game,
  board: Board,
  playingFor: BoardPiece,
  handleSquareClicked?: (boardId: number, id: number) => void;
  playerInputAllowed?: boolean;
};

export default InteractiveBoard;