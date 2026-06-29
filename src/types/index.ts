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

export type UserPublic = Omit<User, "password_hash">;

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

export interface FollowRow {
  follower_id: string;
  followee_id: string;
  created_at: Date;
}

export interface LikeRow {
  user_id: string;
  video_id: string;
  created_at: Date;
}

export interface CommentRow {
  id: string;
  user_id: string;
  video_id: string;
  content: string;
  created_at: Date;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}
