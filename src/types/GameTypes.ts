export type Board = {
  id: number;
  positions: number[];
  winner: BoardPiece | null,
  winningLine: number[] | null;
}

export type Game = {
  id: number;
  boards: Array<Board>;
  winner: BoardPiece | null;
  winningLine: Array<number> | null;
  nextPiece: BoardPiece;
};

export enum BoardPiece {
  DRAW,
  X,
  O
}