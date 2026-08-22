export const SECURE_PASSWORD_LENGTH = 20;

const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const NUMBERS = "0123456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{}:,.?";
const ALL_CHARACTERS = LOWERCASE + UPPERCASE + NUMBERS + SYMBOLS;

export type RandomBytes = (count: number) => Uint8Array;

function pickCharacter(characters: string, bytes: Uint8Array, offset: number) {
  return characters[bytes[offset] % characters.length];
}

export function generateStrongPassword(randomBytes: RandomBytes, length = SECURE_PASSWORD_LENGTH) {
  if (length < 12) throw new Error("Generated passwords must be at least 12 characters long.");
  const bytes = randomBytes(length + 4);
  const required = [
    pickCharacter(LOWERCASE, bytes, 0),
    pickCharacter(UPPERCASE, bytes, 1),
    pickCharacter(NUMBERS, bytes, 2),
    pickCharacter(SYMBOLS, bytes, 3),
  ];
  const password = [...required];
  for (let index = required.length; index < length; index += 1) {
    password.push(pickCharacter(ALL_CHARACTERS, bytes, index));
  }
  for (let index = password.length - 1; index > 0; index -= 1) {
    const swapIndex = bytes[index + 4] % (index + 1);
    [password[index], password[swapIndex]] = [password[swapIndex], password[index]];
  }
  return password.join("");
}
