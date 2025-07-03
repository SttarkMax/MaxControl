
import { nanoid } from 'nanoid';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export const generateId = () => nanoid();

export const hashPassword = async (password: string): Promise<string> => {
    return await bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
    return await bcrypt.compare(password, hash);
};

export const addMonths = (date: Date, months: number): Date => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  if (d.getDate() !== date.getDate()) {
    d.setDate(0);
  }
  return d;
};

export const addWeeks = (date: Date, weeks: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
};

export const formatDateForDb = (date: Date): string => {
  return date.toISOString().split('T')[0];
};
