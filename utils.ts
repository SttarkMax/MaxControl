
import { QuoteStatus } from './types';

export const translateQuoteStatus = (status: QuoteStatus): string => {
  switch (status) {
    case 'draft':
      return 'Rascunho';
    case 'sent':
      return 'Enviado';
    case 'accepted':
      return 'Aceito';
    case 'rejected':
      return 'Rejeitado';
    case 'converted_to_order':
      return 'Convertido em OS';
    case 'cancelled':
      return 'Cancelado';
    default:
      return status;
  }
};

// Helper to format currency, can be expanded
export const formatCurrency = (amount?: number): string => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return (0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  // Handle cases where the day might exceed the number of days in the target month
  // e.g., Jan 31 + 1 month should be Feb 28/29, not Mar 2/3
  if (result.getDate() !== date.getDate() && date.getMonth() !== (date.getMonth() + months) % 12) {
    result.setDate(0); // Sets date to the last day of the previous month
  }
  return result;
};

export const addWeeks = (date: Date, weeks: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + weeks * 7);
  return result;
};

// Helper to format date to YYYY-MM-DD for input[type="date"]
export const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};