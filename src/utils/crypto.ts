// Simple crypto utility for encrypting and decrypting authentication cookies
import * as crypto from "crypto";

// In a production app, use a more robust approach for key management
export function encrypt(text: string, secretKey: string): string {
  // Create an initialization vector
  const iv = crypto.randomBytes(16);

  // Create a cipher using AES-256-CBC
  const key = crypto
    .createHash("sha256")
    .update(secretKey)
    .digest("base64")
    .substring(0, 32);
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(key), iv);

  // Encrypt the text
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  // Return the IV and encrypted data as a single string
  return iv.toString("hex") + ":" + encrypted;
}

export function decrypt(encryptedText: string, secretKey: string): string {
  // Split the IV and encrypted data
  const textParts = encryptedText.split(":");
  const iv = Buffer.from(textParts[0], "hex");
  const encryptedData = textParts[1];

  // Create a decipher using AES-256-CBC
  const key = crypto
    .createHash("sha256")
    .update(secretKey)
    .digest("base64")
    .substring(0, 32);
  const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(key), iv);

  // Decrypt the data
  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
