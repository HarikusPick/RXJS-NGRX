export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  age: number;
  image: string;
}

export interface UsersState {
  users: User[];
  total: number;
  loading: boolean;
  error: string | null;
}
