// hooks/useNumberFormat.ts
import { useState, useCallback, useEffect } from 'react';

export const useNumberFormat = (initialValue: number = 0) => {
  const [value, setValue] = useState<number>(initialValue);
  const [displayValue, setDisplayValue] = useState<string>(initialValue.toString());

  // Convertir número a string sin formato (para edición)
  const numberToString = (num: number): string => {
    if (isNaN(num)) return '';
    // Convertir a string con punto decimal (formato interno)
    return num.toString();
  };

  // Convertir string ingresado por usuario a número
  const parseUserInput = (input: string): number => {
    if (input === '' || input === '-') return 0;
    
    // Reemplazar punto por coma (si el usuario usó punto como decimal)
    let processed = input.replace(/\./g, ',');
    
    // Eliminar cualquier punto que no sea decimal (separadores de miles)
    // Pero como usamos coma para decimal, eliminamos todos los puntos
    processed = processed.replace(/\./g, '');
    
    // Reemplazar coma decimal por punto para el parseo interno
    processed = processed.replace(/,/g, '.');
    
    // Eliminar cualquier carácter que no sea número, punto o signo negativo
    processed = processed.replace(/[^0-9.-]/g, '');
    
    const parsed = parseFloat(processed);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Formatear número para mostrar (con coma decimal)
  const formatForDisplay = (num: number): string => {
    if (isNaN(num)) return '';
    // Convertir a string y reemplazar punto por coma
    return num.toString().replace(/\./g, ',');
  };

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let rawValue = e.target.value;
    
    // ✅ Permitir que el usuario pueda borrar todo (dejar vacío)
    if (rawValue === '') {
      setDisplayValue('');
      setValue(0);
      return;
    }
    
    // ✅ Si el usuario escribe un punto, convertirlo a coma automáticamente
    if (rawValue.endsWith('.')) {
      rawValue = rawValue.slice(0, -1) + ',';
    }
    
    // ✅ Si el usuario escribe dos comas, evitar
    const commaCount = (rawValue.match(/,/g) || []).length;
    if (commaCount > 1) return;
    
    // ✅ Si el usuario escribe un número negativo al principio
    if (rawValue === '-') {
      setDisplayValue('-');
      setValue(0);
      return;
    }
    
    // Parsear el valor ingresado
    const numericValue = parseUserInput(rawValue);
    
    // Actualizar valor interno
    setValue(numericValue);
    
    // Mostrar exactamente lo que el usuario escribió (sin formateo automático)
    // Esto permite que el usuario pueda borrar completamente
    setDisplayValue(rawValue);
  }, []);

  // Cuando el input pierde el foco, formatear correctamente
  const handleBlur = useCallback(() => {
    if (displayValue === '' || displayValue === '-') {
      setDisplayValue('0');
      setValue(0);
    } else {
      // Formatear con coma decimal al perder foco
      const formatted = formatForDisplay(value);
      setDisplayValue(formatted);
    }
  }, [displayValue, value]);

  // Cuando el input recibe foco, mostrar el valor sin formato
  const handleFocus = useCallback(() => {
    if (value !== 0) {
      setDisplayValue(numberToString(value));
    } else if (displayValue === '0') {
      setDisplayValue('');
    }
  }, [value, displayValue]);

  // Sincronizar cuando cambia el valor externo
  const setFormattedValue = useCallback((num: number) => {
    setValue(num);
    setDisplayValue(formatForDisplay(num));
  }, []);

  // Inicializar
  useEffect(() => {
    if (initialValue !== 0 && value === 0) {
      setValue(initialValue);
      setDisplayValue(formatForDisplay(initialValue));
    }
  }, [initialValue]);

  return { 
    value, 
    displayValue, 
    handleChange, 
    handleBlur,
    handleFocus,
    setFormattedValue 
  };
};