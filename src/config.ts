import type { Site, SocialObjects } from "./types";

export const SITE: Site = {
  website: "https://pbar1.github.io/www/",
  author: "Pierce Bartine",
  desc: "Pierce Bartine's blog",
  title: "Pierce Bartine",
  ogImage: "og.jpg",
  lightAndDarkMode: true,
  postPerPage: 3,
};

export const LOCALE = ["en-EN"]; // set to [] to use the environment default

export const LOGO_IMAGE = {
  enable: false,
  svg: true,
  width: 216,
  height: 46,
};

export const SOCIALS: SocialObjects = [
  {
    name: "Github",
    href: "https://github.com/pbar1",
    linkTitle: `${SITE.title} on Github`,
    active: true,
  },
  {
    name: "GitLab",
    href: "https://gitlab.com/pbar",
    linkTitle: `${SITE.title} on GitLab`,
    active: true,
  },
  {
    name: "Discord",
    href: "https://discordapp.com/users/356657112350326784",
    linkTitle: `${SITE.title} on Discord`,
    active: true,
  },
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/in/pbar",
    linkTitle: `${SITE.title} on LinkedIn`,
    active: true,
  },
  {
    name: "Mastodon",
    href: "https://hachyderm.io/@pbar",
    linkTitle: `${SITE.title} on Mastodon`,
    active: true,
  },
];
