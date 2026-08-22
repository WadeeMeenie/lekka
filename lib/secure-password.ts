import * as Crypto from "expo-crypto";

import { generateStrongPassword, SECURE_PASSWORD_LENGTH } from "@/lib/secure-password-core";

export function createSecurePassword() {
  return generateStrongPassword((count) => Crypto.getRandomBytes(count), SECURE_PASSWORD_LENGTH);
}
