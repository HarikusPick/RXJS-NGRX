export interface Post {
  id: number;
  title: string;
  body: string;
  tags: string[];
  reactions: { likes: number; dislikes: number };
  userId: number;
  views: number;
}

export interface PostsState {
  posts: Post[];
  total: number;
  loading: boolean;
  error: string | null;
}
