import Square from './SquareComponent';

const Board: React.FC<BoardProps> = ({ positions, ended, winningLine }) => {
  Board.displayName = "Board";
  const isEmpty = !positions.find((square => square === 1 || square === 2));

  return (
    <>
      <div className='glow-effect'>
        <div className={`grid grid-cols-3 grid-rows-3 text-center font-bold sm:text-sm md:text-2xl aspect-square ${isEmpty ? 'ring-4 ring-blue-500' : ''} ${ended ? 'opacity-0  duration-500 md:delay-700' : ''}`}>
          {Array.from({ length: 9 }).map((_, index) => (
            <Square
              key={index}
              isWinning={winningLine?.includes(index)}
              pieceAtPosition={positions[index]}
            />
          ))}

          <svg className="glow-container">
            <rect pathLength="100" className="glow-blur"></rect>
            <rect pathLength="100" className="glow-line"></rect>
          </svg>

          
        </div>
      </div>
    </>
  )
};

type BoardProps = {
  positions: Array<number>;
  winningLine?: Array<number>;
  ended: boolean;
};

export default Board;