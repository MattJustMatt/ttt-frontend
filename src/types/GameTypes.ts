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
  winnerUsername: string | null;
};

export type SanitizedPlayer = {
  uuid: string;
  username: string | null;
  playingFor: BoardPiece;
  score: number;
  online: boolean;
  currentEmoteSlug: string | null;
};

export type Emote = {
  slug: string,
  name: string;
  pathName: string;
};

export enum BoardPiece {
  DRAW,
  X,
  O
}
