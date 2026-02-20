export interface Profile {
  id: string;
  updated_at: string | null;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  website: string | null;
  bio: string | null;
  favorite_genres: string[] | null;
}

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  // enriched fields
  items?: { image_url: string | null }[];
  item_count?: number;
}

export interface CollectionItem {
  id: string;
  collection_id: string;
  media_id: string;
  media_type: string;
  title: string | null;
  image_url: string | null;
  metadata: any;
  position?: number;
  created_at: string;
}
