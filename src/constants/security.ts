export const PASSWORD_REQUIREMENTS = [
  { id: 'length', label: 'Mínimo 8 caracteres', regex: /.{8,}/ },
  { id: 'letter', label: 'Al menos una Letra', regex: /[a-zA-Z]/ },
  { id: 'number', label: 'Al menos un Número', regex: /[0-9]/ },
];

export const validatePassword = (password: string) => {
  return PASSWORD_REQUIREMENTS.every(req => req.regex.test(password));
};
