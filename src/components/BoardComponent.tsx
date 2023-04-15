import { memo } from 'react';
import Square from './SquareComponent';

const Board: React.FC<BoardProps> = memo(({ positions, ended, winningLine }) => {
  return (
    <>
      <div className={`grid grid-cols-3 grid-rows-3 text-center font-bold sm:text-sm md:text-2xl aspect-square ${ended ? 'opacity-0  duration-500 md:delay-700' : ''}`}>
        {Array.from({ length: 9 }).map((_, index) => (
          <Square
            key={index}
            isWinning={winningLine?.includes(index)}
            pieceAtPosition={positions[index]}
          />
        ))}
      </div>
    </>
  );
});
Board.displayName = "Board";

type BoardProps = {
  positions: Array<number>;
  winningLine?: Array<number>;
  ended: boolean;
};

export default Board;