import type { BoardPiece, Game, SanitizedPlayer } from "./GameTypes";

export type RealtimeResponse = {
  code: number;
  message: string;
}

export interface ServerToClientEvents {
  playerInformation: (uuid: string, username: string | null, playingFor: BoardPiece) => void;
  history: (gameHistory: Array<Game>) => void;
  playerList: (playerList: Array<SanitizedPlayer>) => void;
  update: (gameId: number, boardId: number, squareId: number, updatedPiece: BoardPiece) => void;
  end: (gameId: number, boardId: number | null, winner: BoardPiece, winningLine: Array<number> | null, winnerUsername: string) => void;
  emote: (playerUuid: string, emoteSlug: string) => void;
}

export interface ClientToServerEvents {
  clientUpdate: (gameId: number, boardId: number, squareId: number, updatedPiece: BoardPiece) => void;
  requestUsername: (username: string) => void;
  emote: (emoteSlug: string) => void;
}