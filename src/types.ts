export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface UserPublic {
  id: string;
  username: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: Date;
}

export interface RegisterBody {
  username: string;
  email: string;
  password: string;
  full_name?: string;
}

export interface LoginBody {
  email: string;
  password: string;
}
