

import { UserAccessLevel } from './types';

export const CARD_SURCHARGE_PERCENTAGE = 15; // 15% surcharge for card payments
export const DEFAULT_USER_ACCESS_LEVEL = UserAccessLevel.SALES; // Default access level for new users (simulated)
export const APP_NAME = "MaxControl";
export const GEMINI_TEXT_MODEL = "gemini-2.5-flash-preview-04-17";
export const GEMINI_IMAGE_MODEL = "imagen-3.0-generate-002"; // Example, not used in this iteration
export const PRODUCT_CATEGORIES_STORAGE_KEY = 'productCategories';
export const USERS_STORAGE_KEY = 'appUsers'; // Key for storing user data
export const ACCOUNTS_PAYABLE_STORAGE_KEY = 'accountsPayable';

// New keys for Supplier Management
export const SUPPLIERS_STORAGE_KEY = 'suppliers';
export const DEBTS_STORAGE_KEY = 'debts';
export const SUPPLIER_CREDITS_STORAGE_KEY = 'supplierCredits';