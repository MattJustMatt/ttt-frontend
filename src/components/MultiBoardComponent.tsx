
import { getColorClassForPiece } from "~/lib/utils";
import InteractiveBoard from "./InteractiveBoardComponent";
import { BoardPiece, type Board, type Game } from "~/types/GameTypes";

const MultiBoardComponent: React.FC<BoardSetProps> = ({ game, boards, handleSquareClicked }) => {
    return (
        <>
            { game.winner &&
                <div className={`m-10 p-10 shadow-2xl ${getColorClassForPiece(game.winner, true)}`}>
                    <h2 className="text-slate-200 text-5xl font-semibold text-center">{ game.winner === BoardPiece.X ? 'X' : 'O'} WON!</h2>
                </div>
            }

            <div className={`grid grid-rows-3 grid-cols-3 gap-3 ${ game.winner ? 'opacity-0 transition-opacity duration-1000 delay-1000' : ''} `}>
                { Array.from(boards).map((board, i) =>
                    <InteractiveBoard 
                        key={i}
                        board={board}
                        nextPiece={game.nextPiece}
                        handleSquareClicked={handleSquareClicked}
                        playerInputAllowed={!game.winner}
                    />
                )}
            </div>
        </>
    )
};

type BoardSetProps = {
    game: Game;
    boards: Array<Board>;
    handleSquareClicked(boardId: number, squareId: number): void;
};

export default MultiBoardComponent;