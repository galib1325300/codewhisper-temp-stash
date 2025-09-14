export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const validateWpUsername = (username: string): boolean => {
  if (!username) return true; // Optional field
  
  // Doit commencer par une lettre et contenir uniquement des lettres, chiffres, @, _, ., -
  return /^[a-zA-Z][a-zA-Z0-9@._-]{2,}$/.test(username);
};

export const validateWpPassword = (password: string): boolean => {
  if (!password) return true; // Optional field
  
  // Supprime les espaces superflus et vérifie le format
  const cleanedPassword = password.trim().replace(/\s+/g, ' ');
  const parts = cleanedPassword.split(' ');
  
  // Vérifie que chaque partie fait exactement 4 caractères
  return parts.every(part => /^[A-Za-z0-9]{4}$/.test(part));
};

export const formatWpPassword = (password: string): string => {
  // Nettoie les espaces et regroupe par 4 caractères
  const cleaned = password.replace(/[^A-Za-z0-9]/g, '');
  const parts = cleaned.match(/.{1,4}/g) || [];
  return parts.join(' ');
};