import type { Game, Board, BoardPiece } from "~/types/GameTypes";

// Keeps track of the current board index we're adding and wraps around to zero every time we hit "maxBoards"
let keyCounter = 0;

function boardsReducer(boards: Map<number, Board>, action: BoardAction) {
  console.log(action)
  switch(action.type) {
      case 'initialize': {
        const newBoards = new Map();
        
        action.game.boards.forEach((board, index) => {
          newBoards.set(index, board);
        });
        
        return newBoards;
      }
      case 'create': {
        const updatedBoards = new Map(boards);

        const nextKey: number = keyCounter % action.maxBoards;
        keyCounter++;
        
        if (action.board) {
          updatedBoards.set(nextKey, { id: action.boardId, positions: action.board.positions, winner: action.board.winner, winningLine: action.board.winningLine });
        } else {
          updatedBoards.set(nextKey, { id: action.boardId, positions: Array<number>(9).fill(0), winner: null, winningLine: null });
        }
        
        return updatedBoards;
      }
      case 'update_square': {
        const updatedBoards = new Map(boards);
    
        for (const [key, board] of updatedBoards.entries()) {
          if (board.id === action.boardId) {
            const newPositions = board.positions.slice();
            newPositions[action.position] = action.newPlayer;

            updatedBoards.set(key, {...board, positions: newPositions, winner: null, winningLine: null});
            break;
          }
        }
    
        return updatedBoards;
      }
      case 'end_board': {
        const updatedBoards = new Map(boards); 

        for (const [key, board] of updatedBoards.entries()) {
          if (board.id === action.boardId) {
            updatedBoards.set(key, {...board, winner: action.winner, winningLine: action.winningLine});

            return updatedBoards;
          }
        }

        return updatedBoards;
      }
      case 'reset': {
        return new Map();
      }
  }
}

type InitializeAction = {
  type: 'initialize';
  game: Game;
};

type CreateAction = {
  type: 'create';
  maxBoards: number;
  boardId: number;
  board?: Board;
};

type UpdateSquareAction = {
  type: 'update_square';
  boardId: number;
  position: number;
  newPlayer: BoardPiece;
};

type EndBoardAction = {
  type: 'end_board';
  boardId: number;
  winner: BoardPiece;
  winningLine: number[];
};

type ResetAction = {
  type: 'reset';
};

export type BoardAction = InitializeAction | CreateAction | UpdateSquareAction | EndBoardAction | ResetAction;

export default boardsReducer;