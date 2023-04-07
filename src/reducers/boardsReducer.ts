// Keeps track of the current board index we're adding and wraps around to zero every time we hit "maxBoards"
let keyCounter = 0;

function boardsReducer(boards: Map<number, Board>, action: BoardAction) {
  switch(action.type) {
      case 'create': {
        const updatedBoards = new Map(boards);

        const nextKey: number = keyCounter % action.maxBoards;
        keyCounter++;
        
        updatedBoards.set(nextKey, { id: action.gameId, positions: Array<number>(9).fill(0), ended: false, winningLine: [] });
        return updatedBoards;
      }
      case 'update_square': {
        const updatedBoards = new Map(boards);
    
        for (const [key, board] of updatedBoards.entries()) {
          if (board.id === action.gameId) {
            board.positions[action.position] = action.newPlayer;
            updatedBoards.set(key, board);
            break;
          }
        }
    
        return updatedBoards;
      }
      case 'end_game': {
        const updatedBoards = new Map(boards); 

        for (const [key, board] of updatedBoards.entries()) {
          if (board.id === action.gameId) {
            updatedBoards.set(key, {...board, ended: true, winningLine: action.winningLine});

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

type Board = {
  id: number;
  positions: number[];
  ended: boolean;
  winningLine: number[];
};

type CreateAction = {
  type: 'create';
  maxBoards: number;
  gameId: number;
};

type UpdateSquareAction = {
  type: 'update_square';
  gameId: number;
  position: number;
  newPlayer: number;
};

type EndGameAction = {
  type: 'end_game';
  gameId: number;
  winningLine: number[];
};

type ResetAction = {
  type: 'reset';
};

type BoardAction = CreateAction | UpdateSquareAction | EndGameAction | ResetAction;

export default boardsReducer;