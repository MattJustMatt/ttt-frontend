export const formatNumberWithCommas = (num: number) => {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(num);
};