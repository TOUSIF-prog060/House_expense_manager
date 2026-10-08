import { z } from 'zod';

const decimalAmount = z.string().regex(/^\d+(?:\.\d{1,2})?$/, 'Use a positive amount with up to two decimal places.');
export const expenseSchema = z.object({
  householdId: z.string().uuid(), title: z.string().trim().min(1).max(120), amount: decimalAmount,
  category: z.string().min(1), expenseDate: z.string().date(), paidBy: z.string().uuid(),
  participants: z.array(z.object({ userId: z.string().uuid(), value: z.union([z.string(), z.number()]).optional() })).min(1),
  splitMethod: z.enum(['equal', 'exact', 'percentage']), notes: z.string().max(2000).optional(),
}).strict();
export const feedingSchema = z.object({ householdId: z.string().uuid(), mealSlotId: z.string().uuid(), feedingDate: z.string().date(), petId: z.string().uuid().optional(), note: z.string().max(500).optional() }).strict();
export const petSchema = z.object({ householdId: z.string().uuid(), name: z.string().trim().min(1, 'Please enter a name for the cat.').max(60, 'Name must be 60 characters or less.') }).strict();
export const paymentSchema = z.object({ householdId: z.string().uuid(), fromUser: z.string().uuid(), toUser: z.string().uuid(), amount: decimalAmount, paymentMethod: z.enum(['upi', 'cash', 'bank_transfer', 'other']), paymentDate: z.string().date(), notes: z.string().max(500).optional() }).strict().refine((payment) => payment.fromUser !== payment.toUser, 'A payment must be between two different people.');
