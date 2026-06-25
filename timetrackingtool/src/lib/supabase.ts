import { createClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "../../utils/supabase/info";

export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

export interface BankAccount {
  accountHolder: string;
  bankName: string;
  sortCode: string;
  accountNumber: string;
  iban?: string;
  paymentRef?: string;
}
