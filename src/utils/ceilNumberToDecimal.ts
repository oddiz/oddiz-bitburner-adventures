export function ceilNumberToDecimal(number: number, decimalPlaces: number): number {
    return Math.ceil(number * 10 ** decimalPlaces) / 10 ** decimalPlaces;
}
