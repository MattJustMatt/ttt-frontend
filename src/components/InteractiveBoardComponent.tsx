
import { type BoardPiece, type Board } from '~/types/GameTypes';
import Square from './SquareComponent';
import { useEffect } from 'react';

const InteractiveBoard: React.FC<BoardProps> = ({ board, nextPiece, handleSquareClicked, playerInputAllowed }) => {
  InteractiveBoard.displayName = "Board";
  const ended = !!board.winner;

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
  }, []);

  return (
    <>
      <div className={`${!ended || !playerInputAllowed ? 'glow-effect' : `ring-4 ${ board.winner === 1 ? 'ring-orange-500' : 'ring-green-500'}`}`}>
        {ended && <h2 className='absolute text-5xl font-extrabold text-white'>{board.winner === 1 ? 'X' : 'O'}</h2>}
        <div className={`${ended ? 'opacity-20 transition-opacity duration-300 delay-75' : ''}`}>
          <div className={`grid grid-cols-3 grid-rows-3 text-center font-bold sm:text-sm md:text-2xl aspect-square`}>
            {Array.from({ length: 9 }).map((_, index) => (
              <Square
                key={index}
                nextPiece={nextPiece}
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
};

type BoardProps = {
  board: Board,
  nextPiece: BoardPiece,
  handleSquareClicked?: (boardId: number, id: number) => void;
  playerInputAllowed?: boolean;
};

export default InteractiveBoard;