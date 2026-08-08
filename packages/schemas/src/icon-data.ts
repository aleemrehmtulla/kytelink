export type IconOption = {
  name: string;
  icon: string;
  prefill: string;
  username: string;
  hidden?: boolean;
};

export const ICON_OPTIONS: readonly IconOption[] = [
  {
    name: "Twitter",
    icon: "FaTwitter",
    prefill: "https://twitter.com/",
    username: "0xLogan",
  },
  {
    name: "Snapchat",
    icon: "FaSnapchat",
    prefill: "https://snapchat.com/add/",
    username: "coolguy123",
  },
  {
    name: "Contact",
    icon: "FaRegUserCircle",
    prefill: "CONTACT",
    username: "coolguy123",
    hidden: true,
  },
  {
    name: "Discord",
    icon: "FaDiscord",
    prefill: "https://discord.gg/",
    username: "your-invite-code",
  },
  {
    name: "TikTok",
    icon: "FaTiktok",
    prefill: "https://www.tiktok.com/",
    username: "@charlesthegreat",
  },
  {
    name: "Instagram",
    icon: "FaInstagram",
    prefill: "https://instagram.com/",
    username: "charliedamelio",
  },
  {
    name: "Email",
    icon: "FaEnvelope",
    prefill: "mailto:",
    username: "aleemrehmtulla@gmail.com",
  },
  {
    name: "Github",
    icon: "FaGithub",
    prefill: "https://github.com/",
    username: "shadowycoder",
  },
  {
    name: "Linkedin",
    icon: "FaLinkedin",
    prefill: "https://linkedin.com/in/",
    username: "steven-parker",
  },
  {
    name: "Medium",
    icon: "FaMedium",
    prefill: "https://medium.com/@",
    username: "jamesqquick",
  },
  {
    name: "Youtube",
    icon: "FaYoutube",
    prefill: "https://youtube.com/",
    username: "/channel/UCYUjYUqX3ZtYJw1Y7vqoU9A",
  },
  {
    name: "Facebook",
    icon: "FaFacebook",
    prefill: "https://facebook.com/",
    username: "witney.carson",
  },
  {
    name: "Telegram",
    icon: "FaTelegramPlane",
    prefill: "https://t.me/",
    username: "Tyler141",
  },
  {
    name: "Twitch",
    icon: "FaTwitch",
    prefill: "https://www.twitch.tv/",
    username: "adinross",
  },
  {
    name: "Reddit",
    icon: "FaReddit",
    prefill: "https://www.reddit.com/user/",
    username: "joey",
  },
];

export const VISIBLE_ICON_OPTIONS: readonly IconOption[] = ICON_OPTIONS.filter(
  (option) => !option.hidden,
);

export const ICON_FA_KEYS: Record<string, string> = Object.fromEntries(
  ICON_OPTIONS.map((option) => [option.name, option.icon] as [string, string]),
);

export function getIconFaKey(name: string): string | undefined {
  return ICON_FA_KEYS[name];
}
