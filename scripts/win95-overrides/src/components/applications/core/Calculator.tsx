import React, { useState } from 'react';
import CoreAppFrame from './CoreAppFrame';
import { applyOperation } from './logic/calculator';

const Calculator: React.FC<WindowAppProps> = (props) => {
    const [display, setDisplay] = useState('0');
    const [accumulator, setAccumulator] = useState<number | null>(null);
    const [operator, setOperator] = useState<string | null>(null);
    const [replaceDisplay, setReplaceDisplay] = useState(true);

    const clear = () => {
        setDisplay('0');
        setAccumulator(null);
        setOperator(null);
        setReplaceDisplay(true);
    };

    const digit = (value: string) => {
        if (display === 'Error' || replaceDisplay) {
            setDisplay(value === '.' ? '0.' : value);
            setReplaceDisplay(false);
            return;
        }
        if (value === '.' && display.includes('.')) return;
        setDisplay(display === '0' && value !== '.' ? value : `${display}${value}`);
    };

    const chooseOperator = (nextOperator: string) => {
        const current = Number(display);
        if (!Number.isFinite(current)) {
            clear();
            return;
        }
        if (accumulator !== null && operator && !replaceDisplay) {
            const result = applyOperation(accumulator, operator, current);
            if (result === 'Error') {
                setDisplay('Error');
                setAccumulator(null);
                setOperator(null);
                setReplaceDisplay(true);
                return;
            }
            setAccumulator(result as number);
            setDisplay(String(result));
        } else {
            setAccumulator(current);
        }
        setOperator(nextOperator);
        setReplaceDisplay(true);
    };

    const equals = () => {
        if (accumulator === null || !operator) return;
        const current = Number(display);
        const result = applyOperation(accumulator, operator, current);
        setDisplay(String(result));
        setAccumulator(null);
        setOperator(null);
        setReplaceDisplay(true);
    };

    const backspace = () => {
        if (replaceDisplay || display === 'Error') return;
        const next = display.slice(0, -1);
        setDisplay(next && next !== '-' ? next : '0');
    };

    const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (event) => {
        if (/^[0-9.]$/.test(event.key)) digit(event.key);
        else if (['+', '-', '*', '/'].includes(event.key)) chooseOperator(event.key);
        else if (event.key === 'Enter' || event.key === '=') equals();
        else if (event.key === 'Backspace') backspace();
        else if (event.key === 'Escape') clear();
        else return;
        event.preventDefault();
    };

    const buttons = [
        ['C', clear], ['⌫', backspace], ['÷', () => chooseOperator('/')], ['×', () => chooseOperator('*')],
        ['7', () => digit('7')], ['8', () => digit('8')], ['9', () => digit('9')], ['−', () => chooseOperator('-')],
        ['4', () => digit('4')], ['5', () => digit('5')], ['6', () => digit('6')], ['+', () => chooseOperator('+')],
        ['1', () => digit('1')], ['2', () => digit('2')], ['3', () => digit('3')], ['=', equals],
        ['0', () => digit('0')], ['.', () => digit('.')],
    ] as const;

    return (
        <CoreAppFrame {...props} title="Calculator" width={360} height={430} status="Ready" onKeyDown={onKeyDown}>
            <div style={styles.body}>
                <output aria-label="Calculator display" style={styles.display}>{display}</output>
                <div style={styles.grid}>
                    {buttons.map(([label, action]) => (
                        <button
                            type="button"
                            key={label}
                            onClick={action}
                            style={Object.assign({}, styles.button, label === '0' && styles.zero)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <div style={styles.hint}>Keyboard: 0-9, + − × ÷, Enter, Backspace, Esc</div>
            </div>
        </CoreAppFrame>
    );
};

const styles: StyleSheetCSS = {
    body: { display: 'flex', flex: 1, flexDirection: 'column', gap: 8, padding: 10, overflow: 'auto' },
    display: {
        display: 'block', minHeight: 48, padding: '8px 10px', boxSizing: 'border-box',
        borderTop: '2px solid #404040', borderLeft: '2px solid #404040', borderRight: '2px solid #ffffff', borderBottom: '2px solid #ffffff',
        backgroundColor: '#ffffff', fontFamily: 'monospace', fontSize: 24, textAlign: 'right', overflow: 'hidden', whiteSpace: 'nowrap',
    },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5 },
    button: {
        minHeight: 46, borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #404040', borderBottom: '2px solid #404040',
        backgroundColor: '#c0c0c0', color: '#000000', fontFamily: 'MSSerif', fontSize: 15, cursor: 'pointer',
    },
    zero: { gridColumn: 'span 2' },
    hint: { fontSize: 9, color: '#404040', textAlign: 'center' },
};

export default Calculator;
