export const PASSWORD_REQUIREMENTS = [
  { id: 'length', label: 'Mínimo 8 caracteres', regex: /.{8,}/ },
  { id: 'upper', label: 'Al menos una Mayúscula', regex: /[A-Z]/ },
  { id: 'number', label: 'Al menos un Número', regex: /[0-9]/ },
  { id: 'special', label: 'Un carácter especial (@, #, $, etc.)', regex: /[!@#$%^&*(),.?":{}|<>]/ },
];

export const validatePassword = (password: string) => {
  return PASSWORD_REQUIREMENTS.every(req => req.regex.test(password));
};
