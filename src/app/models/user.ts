export interface User {
  _id?: string;
  id?: string;
  username: string;
  name: string;
  email: string;
  phone?: string;
  createdAt?: Date;
  loginAt?: Date;
  updatedAt?: Date;
  isOnline?: boolean;
  lastSeen?: Date;
}
