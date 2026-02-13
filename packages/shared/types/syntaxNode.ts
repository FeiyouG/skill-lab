export type SyntaxNodeLike = {
    type: string;
    text: string;
    startPosition: { row: number; column: number };
    endPosition: { row: number; column: number };
    children: SyntaxNodeLike[];
};
