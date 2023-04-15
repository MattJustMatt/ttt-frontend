import { BoardPiece } from "~/types/GameTypes";

export const formatNumberWithCommas = (num: number) => {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(num);
};

export const getColorClassForPiece = (piece: BoardPiece, isWinning: boolean): string => {
  switch (piece) {
    case BoardPiece.X: {
      if (isWinning) return "bg-orange-600";
      if (!isWinning) return "bg-orange-400";
    }
    case BoardPiece.O: {
      if (isWinning) return "bg-green-600";
      if (!isWinning) return "bg-green-400";
    }
    case BoardPiece.DRAW: {
      return '';
    }
  }
};

export const getCurrentDimension = () => {
  return {
    width: document.documentElement.clientWidth,
    height: document.documentElement.clientHeight
  }
};