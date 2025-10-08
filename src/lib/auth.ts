import bcrypt from 'bcryptjs';

// Hash the password with salt
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12; // Higher rounds for better security
  return await bcrypt.hash(password, saltRounds);
}

// Verify password against hash
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  console.log('Verifying password:', password, 'against hash:', hash);
  return await bcrypt.compare(password, hash);
}

// Generate hash for your password: ch3wy#IT?
// Run this function once to generate the hash
export async function generatePasswordHash() {
  const password = 'ch3wy#IT?';
  const hash = await hashPassword(password);
  console.log('Generated hash for password:', hash);
  return hash;
}
