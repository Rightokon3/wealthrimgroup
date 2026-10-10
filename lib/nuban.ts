

const WEIGHTS = [3, 7, 3, 3, 7, 3, 3, 7, 3, 3, 7, 3, 3, 7, 3];

function normaliseBankCode(code: string) {
  if (code.length === 3) return '000' + code;
  if (code.length === 5) return '9' + code;
  return code; // 6 digits already
}

export function isValidNubanForBank(accountNumber: string, bankCode: string): boolean {
  if (!/^\d{10}$/.test(accountNumber) || !/^\d{3,6}$/.test(bankCode)) return false;
  const digits = normaliseBankCode(bankCode) + accountNumber.slice(0, 9);
  if (digits.length !== 15) return false;
  const sum = digits.split('').reduce((t, d, i) => t + Number(d) * WEIGHTS[i], 0);
  return (10 - (sum % 10)) % 10 === Number(accountNumber[9]);
}

// Mobile-money style banks give accounts that are often the owner's phone number, which does not
// follow the check-digit rule, so we always offer these as well.
const FINTECH_NAME = /opay|paycom|palmpay|kuda|moniepoint/i;

export function candidateBanks<T extends { name: string; code: string }>(accountNumber: string, banks: T[]) {
  if (!/^\d{10}$/.test(accountNumber)) return { likely: [] as T[], fintech: [] as T[] };
  const likely = banks.filter(b => !FINTECH_NAME.test(b.name) && isValidNubanForBank(accountNumber, b.code));
  const fintech = banks.filter(b => FINTECH_NAME.test(b.name));
  return { likely, fintech };
}