export interface Profile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  timezone: string;
  bio: string;
}
export type Field = keyof Profile;
export type Errors = Partial<Record<Field, string>>;

export const initialProfile: Profile = {
  firstName: 'Александр',
  lastName: 'Морозов',
  email: 'alexander@example.com',
  phone: '+7 999 123-45-67',
  city: 'Томск',
  timezone: 'Asia/Tomsk',
  bio: 'Разрабатываю веб-приложения и инструменты, которые упрощают повседневную работу команды.',
};

export function normalizeProfile(value: Profile): Profile {
  return Object.fromEntries(Object.entries(value).map(([key, text]) => [key, text.trim()])) as unknown as Profile;
}

export function validateProfile(value: Profile): Errors {
  const errors: Errors = {};
  if (!value.firstName.trim()) errors.firstName = 'Укажите имя.';
  else if (value.firstName.length > 60) errors.firstName = 'Не более 60 символов.';
  if (!value.lastName.trim()) errors.lastName = 'Укажите фамилию.';
  else if (value.lastName.length > 60) errors.lastName = 'Не более 60 символов.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) errors.email = 'Введите корректный email.';
  else if (value.email.length > 254) errors.email = 'Не более 254 символов.';
  if (value.phone && (!/^[+\d\s()-]+$/.test(value.phone) || !/^\d{10,15}$/.test(value.phone.replace(/\D/g, '')))) {
    errors.phone = 'Укажите номер из 10–15 цифр.';
  }
  if (value.city.length > 80) errors.city = 'Не более 80 символов.';
  if (!['Asia/Tomsk', 'Europe/Moscow', 'Asia/Yekaterinburg'].includes(value.timezone)) errors.timezone = 'Выберите часовой пояс.';
  if (value.bio.length > 280) errors.bio = 'Не более 280 символов.';
  return errors;
}

export function hasChanges(draft: Profile, saved: Profile): boolean {
  return (Object.keys(saved) as Field[]).some(key => draft[key] !== saved[key]);
}

export type FormState = 'idle' | 'dirty' | 'invalid' | 'saving' | 'success' | 'error';

// Simulated adapter. Only a successful save changes in-memory state; no API or storage.
export async function saveDemoProfile(value: Profile, fail: boolean): Promise<Profile> {
  await new Promise(resolve => setTimeout(resolve, 650));
  if (fail) throw new Error('Не удалось сохранить изменения. Проверьте данные и повторите попытку.');
  return { ...value };
}
