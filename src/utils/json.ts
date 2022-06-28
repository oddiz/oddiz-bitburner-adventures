// use space in the name to avoid the property showing in your completion list
export type Stringified<T> = string & {
    [P in keyof T]: { "_ value": T[P] };
};

export function portParse<T>(text: Stringified<T>): T {
    return JSON.parse(text);
}

export function portStringify<T>(value: T): Stringified<T> {
    return JSON.stringify(value) as unknown as Stringified<T>;
}
