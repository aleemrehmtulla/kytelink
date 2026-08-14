export const DIRECTORY_PAGE_SIZE = 100;

export interface DirectoryEntry {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  lqipUrl: string | null;
}

export interface DirectoryPage {
  entries: DirectoryEntry[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
}
