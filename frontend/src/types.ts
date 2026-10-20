export type Account = {
  email: string;
  invitationOrigin: string;
  tenant: { id: string; slug: string; publicId: string; name: string };
};
export type Session = { csrf: string; account: Account };
export type Attendance = "attending" | "not_attending" | "unsure";
export type Guest = {
  id: string;
  name: string;
  phone: string;
  link: string | null;
  active: 0 | 1;
  createdAt: number;
  deviceCount: number;
  response: null | {
    attendance: Attendance;
    guestCount: number;
    message: string;
    updatedAt: string;
  };
};
export type Content = {
  settings: Record<string, string>;
  media: Record<string, string>;
};
export type API = <T>(
  path: string,
  method?: string,
  value?: unknown,
  type?: string,
) => Promise<T>;
export type Confirm = (message: string, title: string) => Promise<boolean>;
