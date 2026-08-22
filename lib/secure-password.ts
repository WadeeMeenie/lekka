import * as Crypto from "expo-crypto";

import { generateStrongPassword, SECURE_PASSWORD_LENGTH } from "@/lib/secure-password-core";

export function createSecurePassword(length = SECURE_PASSWORD_LENGTH) {
  return generateStrongPassword((count) => Crypto.getRandomBytes(count), length);
}
