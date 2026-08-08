import {
  FaDiscord,
  FaEnvelope,
  FaFacebook,
  FaGithub,
  FaGlobe,
  FaInstagram,
  FaLinkedin,
  FaMedium,
  FaReddit,
  FaSnapchat,
  FaSoundcloud,
  FaSpotify,
  FaTelegramPlane,
  FaTiktok,
  FaTwitch,
  FaTwitter,
  FaUserCircle,
  FaYoutube,
} from "react-icons/fa";
import type { IconType } from "react-icons";

const ICON_MAP: Record<string, IconType> = {
  FaTwitter,
  FaSnapchat,
  FaRegUserCircle: FaUserCircle,
  FaUserCircle,
  FaDiscord,
  FaTiktok,
  FaInstagram,
  FaEnvelope,
  FaGithub,
  FaLinkedin,
  FaMedium,
  FaYoutube,
  FaFacebook,
  FaTelegramPlane,
  FaTwitch,
  FaReddit,
  FaGlobe,
  FaSoundcloud,
  FaSpotify,
};

export interface FaIconProps {
  name: string;
  size?: number;
  className?: string;
}

export function FaIcon({ name, size = 20, className }: FaIconProps) {
  const Icon = ICON_MAP[name] ?? FaGlobe;
  return <Icon size={size} className={className} />;
}

