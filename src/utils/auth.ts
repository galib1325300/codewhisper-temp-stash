interface User {
  email: string;
  password: string;
  isAdmin: boolean;
}

const ADMIN_USER: User = {
  email: 'contact.azquality@gmail.com',
  password: 'Galib1315025300',
  isAdmin: true
};

export const authenticateUser = (email: string, password: string): { success: boolean; isAdmin: boolean } => {
  if (email === ADMIN_USER.email && password === ADMIN_USER.password) {
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('isAdmin', 'true');
    localStorage.setItem('userEmail', email);
    return { success: true, isAdmin: true };
  }
  return { success: false, isAdmin: false };
};