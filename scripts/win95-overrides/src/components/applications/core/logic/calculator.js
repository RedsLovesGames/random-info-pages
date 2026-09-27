export function applyOperation(left, operator, right) {
    switch (operator) {
        case '+':
            return left + right;
        case '-':
            return left - right;
        case '*':
            return left * right;
        case '/':
            return right === 0 ? 'Error' : left / right;
        default:
            return right;
    }
}
