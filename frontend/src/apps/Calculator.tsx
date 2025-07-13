import { memo, useState, useEffect } from 'react';
import { useShortcutManager } from '../services/shortcutManager.ts';

export const Calculator = memo(() => {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [memory, setMemory] = useState<number>(0);
  const [memoryActive, setMemoryActive] = useState(false);
  const { registerAppShortcuts, unregisterAppShortcuts } = useShortcutManager();

  // Format number to avoid floating point precision issues
  const formatNumber = (num: number): string => {
    // Handle special cases
    if (num === 0) return '0';
    if (Number.isInteger(num)) return num.toString();
    
    // Round to 2 decimal places and remove trailing zeros
    const rounded = Math.round(num * 100) / 100;
    return rounded.toFixed(2).replace(/\.?0+$/, '');
  };

  const inputDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
    } else if (display.indexOf('.') === -1) {
      setDisplay(display + '.');
    }
  };

  const clear = () => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  };

  const performOperation = (nextOperation: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const currentValue = previousValue || 0;
      const newValue = calculate(currentValue, inputValue, operation);
      
      if (newValue === null) {
        // Division by zero or other error
        setDisplay('Error');
        setPreviousValue(null);
        setOperation(null);
        setWaitingForOperand(false);
        return;
      }
      
      setDisplay(formatNumber(newValue));
      setPreviousValue(newValue);
    }

    setWaitingForOperand(true);
    setOperation(nextOperation === '=' ? null : nextOperation);
  };

  const calculate = (firstValue: number, secondValue: number, op: string): number | null => {
    switch (op) {
      case '+': return firstValue + secondValue;
      case '-': return firstValue - secondValue;
      case '*': return firstValue * secondValue;
      case '/': 
        if (secondValue === 0) {
          return null; // Division by zero
        }
        return firstValue / secondValue;
      default: return secondValue;
    }
  };

  // Memory functions
  const memoryAdd = () => {
    const currentValue = parseFloat(display);
    const newMemory = memory + currentValue;
    setMemory(newMemory);
    setMemoryActive(true);
  };

  const memorySubtract = () => {
    const currentValue = parseFloat(display);
    const newMemory = memory - currentValue;
    setMemory(newMemory);
    setMemoryActive(true);
  };

  const memoryRecall = () => {
    setDisplay(formatNumber(memory));
    setWaitingForOperand(true);
  };

  const memoryClear = () => {
    setMemory(0);
    setMemoryActive(false);
  };

  // Scientific functions
  const calculateSquareRoot = () => {
    const value = parseFloat(display);
    if (value < 0) {
      setDisplay('Error');
      return;
    }
    setDisplay(formatNumber(Math.sqrt(value)));
    setWaitingForOperand(true);
  };

  const calculatePercentage = () => {
    const value = parseFloat(display);
    setDisplay(formatNumber(value / 100));
    setWaitingForOperand(true);
  };

  const calculatePower = () => {
    const value = parseFloat(display);
    setDisplay(formatNumber(value * value));
    setWaitingForOperand(true);
  };

  const calculateReciprocal = () => {
    const value = parseFloat(display);
    if (value === 0) {
      setDisplay('Error');
      return;
    }
    setDisplay(formatNumber(1 / value));
    setWaitingForOperand(true);
  };

  // Register calculator-specific shortcuts
  useEffect(() => {
    const calculatorShortcuts = [
      {
        id: 'calc-digit-0',
        key: '0',
        description: 'Input digit 0',
        category: 'Calculator',
        icon: '0',
        tags: ['digit', 'number'],
        action: () => inputDigit('0'),
        preventDefault: true
      },
      {
        id: 'calc-digit-1',
        key: '1',
        description: 'Input digit 1',
        category: 'Calculator',
        icon: '1',
        tags: ['digit', 'number'],
        action: () => inputDigit('1'),
        preventDefault: true
      },
      {
        id: 'calc-digit-2',
        key: '2',
        description: 'Input digit 2',
        category: 'Calculator',
        icon: '2',
        tags: ['digit', 'number'],
        action: () => inputDigit('2'),
        preventDefault: true
      },
      {
        id: 'calc-digit-3',
        key: '3',
        description: 'Input digit 3',
        category: 'Calculator',
        icon: '3',
        tags: ['digit', 'number'],
        action: () => inputDigit('3'),
        preventDefault: true
      },
      {
        id: 'calc-digit-4',
        key: '4',
        description: 'Input digit 4',
        category: 'Calculator',
        icon: '4',
        tags: ['digit', 'number'],
        action: () => inputDigit('4'),
        preventDefault: true
      },
      {
        id: 'calc-digit-5',
        key: '5',
        description: 'Input digit 5',
        category: 'Calculator',
        icon: '5',
        tags: ['digit', 'number'],
        action: () => inputDigit('5'),
        preventDefault: true
      },
      {
        id: 'calc-digit-6',
        key: '6',
        description: 'Input digit 6',
        category: 'Calculator',
        icon: '6',
        tags: ['digit', 'number'],
        action: () => inputDigit('6'),
        preventDefault: true
      },
      {
        id: 'calc-digit-7',
        key: '7',
        description: 'Input digit 7',
        category: 'Calculator',
        icon: '7',
        tags: ['digit', 'number'],
        action: () => inputDigit('7'),
        preventDefault: true
      },
      {
        id: 'calc-digit-8',
        key: '8',
        description: 'Input digit 8',
        category: 'Calculator',
        icon: '8',
        tags: ['digit', 'number'],
        action: () => inputDigit('8'),
        preventDefault: true
      },
      {
        id: 'calc-digit-9',
        key: '9',
        description: 'Input digit 9',
        category: 'Calculator',
        icon: '9',
        tags: ['digit', 'number'],
        action: () => inputDigit('9'),
        preventDefault: true
      },
      {
        id: 'calc-add',
        key: '+',
        description: 'Add operation',
        category: 'Calculator',
        icon: '+',
        tags: ['operation', 'add'],
        action: () => performOperation('+'),
        preventDefault: true
      },
      {
        id: 'calc-subtract',
        key: '-',
        description: 'Subtract operation',
        category: 'Calculator',
        icon: '-',
        tags: ['operation', 'subtract'],
        action: () => performOperation('-'),
        preventDefault: true
      },
      {
        id: 'calc-multiply',
        key: '*',
        description: 'Multiply operation',
        category: 'Calculator',
        icon: '*',
        tags: ['operation', 'multiply'],
        action: () => performOperation('*'),
        preventDefault: true
      },
      {
        id: 'calc-divide',
        key: '/',
        description: 'Divide operation',
        category: 'Calculator',
        icon: '/',
        tags: ['operation', 'divide'],
        action: () => performOperation('/'),
        preventDefault: true
      },
      {
        id: 'calc-equals',
        key: 'Enter',
        description: 'Calculate result',
        category: 'Calculator',
        icon: '=',
        tags: ['equals', 'calculate'],
        action: () => performOperation('='),
        preventDefault: true
      },
      {
        id: 'calc-equals-alt',
        key: '=',
        description: 'Calculate result',
        category: 'Calculator',
        icon: '=',
        tags: ['equals', 'calculate'],
        action: () => performOperation('='),
        preventDefault: true
      },
      {
        id: 'calc-decimal',
        key: '.',
        description: 'Input decimal point',
        category: 'Calculator',
        icon: '.',
        tags: ['decimal', 'point'],
        action: inputDecimal,
        preventDefault: true
      },
      {
        id: 'calc-clear',
        key: 'Escape',
        description: 'Clear calculator',
        category: 'Calculator',
        icon: 'C',
        tags: ['clear', 'reset'],
        action: clear,
        preventDefault: true
      },
      {
        id: 'calc-backspace',
        key: 'Backspace',
        description: 'Delete last character',
        category: 'Calculator',
        icon: '⌫',
        tags: ['backspace', 'delete'],
        action: () => {
          if (display.length > 1) {
            setDisplay(display.slice(0, -1));
          } else {
            setDisplay('0');
          }
        },
        preventDefault: true
      },
      {
        id: 'calc-memory-add',
        key: 'M',
        description: 'Add to memory',
        category: 'Calculator',
        icon: 'M+',
        tags: ['memory', 'add'],
        action: memoryAdd,
        preventDefault: true
      },
      {
        id: 'calc-memory-recall',
        key: 'R',
        description: 'Recall from memory',
        category: 'Calculator',
        icon: 'MR',
        tags: ['memory', 'recall'],
        action: memoryRecall,
        preventDefault: true
      },
      {
        id: 'calc-memory-clear',
        key: 'Ctrl+C',
        description: 'Clear memory',
        category: 'Calculator',
        icon: 'MC',
        tags: ['memory', 'clear'],
        action: memoryClear,
        preventDefault: true
      }
    ];

    registerAppShortcuts('calculator', calculatorShortcuts);

    // Cleanup on unmount
    return () => {
      unregisterAppShortcuts('calculator');
    };
  }, [display, operation, previousValue, waitingForOperand, memory, memoryActive]);

  const buttons = [
    ['7', '8', '9', '/'],
    ['4', '5', '6', '*'],
    ['1', '2', '3', '-'],
    ['0', '.', '=', '+']
  ];

  return (
    <div className="p-4 bg-white text-gray-800 h-full dark:bg-gray-800 dark:text-gray-200 flex flex-col">
      <h2 className="text-lg font-semibold mb-4">Calculator</h2>
      
      {/* Display */}
      <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded text-right text-2xl font-mono">
        {display}
      </div>
      
      {/* Memory indicator */}
      {memoryActive && (
        <div className="mb-2 text-xs text-blue-600 dark:text-blue-400 text-center">
          Memory: {formatNumber(memory)}
        </div>
      )}
      
      {/* Keyboard shortcuts hint */}
      <div className="mb-2 text-xs text-gray-500 dark:text-gray-400 text-center">
        Use keyboard: 0-9, +, -, *, /, Enter, Escape, Backspace, M (memory), R (recall)
      </div>
      
      {/* Buttons */}
      <div className="grid grid-cols-4 gap-2 flex-1">
        {/* Memory buttons */}
        <button
          type="button"
          className="p-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors text-sm"
          onClick={memoryAdd}
          title="Memory Add (M)"
        >
          M+
        </button>
        <button
          type="button"
          className="p-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors text-sm"
          onClick={memorySubtract}
          title="Memory Subtract"
        >
          M-
        </button>
        <button
          type="button"
          className="p-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors text-sm"
          onClick={memoryRecall}
          title="Memory Recall (R)"
        >
          MR
        </button>
        <button
          type="button"
          className="p-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors text-sm"
          onClick={memoryClear}
          title="Memory Clear (Ctrl+C)"
        >
          MC
        </button>
        
        {/* Clear button */}
        <button
          type="button"
          className="col-span-4 p-3 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          onClick={clear}
        >
          Clear (Esc)
        </button>
        
        {/* Scientific buttons */}
        <button
          type="button"
          className="p-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm"
          onClick={calculateSquareRoot}
          title="Square Root"
        >
          √
        </button>
        <button
          type="button"
          className="p-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm"
          onClick={calculatePercentage}
          title="Percentage"
        >
          %
        </button>
        <button
          type="button"
          className="p-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm"
          onClick={calculatePower}
          title="Square"
        >
          x²
        </button>
        <button
          type="button"
          className="p-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm"
          onClick={calculateReciprocal}
          title="Reciprocal"
        >
          1/x
        </button>
        
        {/* Number and operation buttons */}
        {buttons.map((row, rowIndex) => (
          row.map((btn, colIndex) => (
            <button
              key={`${rowIndex}-${colIndex}`}
              type="button"
              className={`p-3 rounded transition-colors ${
                btn === '=' 
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : btn === '+' || btn === '-' || btn === '*' || btn === '/'
                  ? 'bg-orange-500 text-white hover:bg-orange-600'
                  : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200'
              }`}
              onClick={() => {
                if (btn === '=') {
                  performOperation('=');
                } else if (btn === '.') {
                  inputDecimal();
                } else if (['+', '-', '*', '/'].includes(btn)) {
                  performOperation(btn);
                } else {
                  inputDigit(btn);
                }
              }}
            >
              {btn}
            </button>
          ))
        ))}
      </div>
    </div>
  );
});

Calculator.displayName = 'Calculator'; 