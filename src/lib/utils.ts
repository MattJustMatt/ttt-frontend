import { BoardPiece } from "~/types/GameTypes";

export const formatNumberWithCommas = (num: number) => {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(num);
};

export const getColorClassForPiece = (piece: BoardPiece, isWinning: boolean): string => {
    switch (piece) {
        case BoardPiece.X: {
          if (isWinning) return "bg-orange-600";
          if (!isWinning) return "bg-orange-300";
        }
        case BoardPiece.O: {
          if (isWinning) return "bg-green-600";
          if (!isWinning) return "bg-green-300";
        }
        case BoardPiece.DRAW: {
          return '';
        }
      }
}