---
title: "Debugging AirPods on Linux"
pubDatetime: 2021-06-27
description: "Getting AirPods bluetooth audio working on Arch Linux"
tags: ["software", "linux", "arch"]
# lastmod: "2021-06-27"
---

Documenting the process I used to get Bluetooth audio working on my Linux laptop. You're welcome, future me.

## Background

Let's be honest - neither Bluetooth nor audio has ever been _easy_ on Linux, at least in comparison to macOS or Windows. Most distros I've tried in the past have had pretty suspect support out of the box, which is why I was pleased when my new EndeavourOS install came up with audio working well. It also had the proprietary NVIDIA GPU driver installed, which itself also usually provides some extra fun - but everything was going to plan so far.

I also like to track my [dotfiles via git][1]. Looking at that repo, you'll notice that not much is in the root, but many things are in the `.config/` directory. It may be a bit OCD of me, but I don't like littering my home directory with `.foo.conf`, `.bar/`, and such. Many programs support reading and writing their config in a directory specified by `XDG_CONFIG_HOME` (which defaults to `~/.config`) by default and falling back to dotfiles in the home dir if that path doesn't exist. I also use a Mac and thus these dotfiles on that machine. Awesomely, simply setting `XDG_CONFIG_HOME` (and the rest of the XDG base dir environment variables) explicity in your shell is enough to get most programs to put config there, even on a Mac.

One of the first things I do when intalling a new distro is to clone my dotfiles into my new home dir; doing this gets me all of my config seen in that repo, part of which is `~/.zshenv`. I use that file to set XDG base dir variables as mentioned. One of them is (was) `XDG_RUNTIME_DIR`; more on this later.

Around the time of cloning my dotfiles, I also installed `bbswitch` to swap between my laptop's integrated GPU and NVIDIA GPU. I then restarted my machine. Once it came back on and I had logged in, _changing sound volume no longer worked via keyboard sound keys_. Of course my first thought was the NVIDIA GPU did it, yours would be too :wink:.

I decided to just leave it be for a while, as sound itself actually still worked. Also, I never really used my AirPods with this machine because of the aforementioned Bluetooth issues in the past. Then a friend of mine asked if I'd tried using them, as he's also an Arch-based user and had had some issues with using AirPods himself on Linux.

It was time to dive in!

## Process

### Fix audio controls

First up - let's get the audio controls back. As I mentioned, audio itself was still working. I opened the PulseAudio Volume Control GUI, and was met with a frozen window perpetually displaying `Establishing connection to PulseAudio`. Seeing this told me the PulseAudio daemon was not running, so I confirmed this by first checking to see if there was even a `pulseaudio` process running:

```sh
pgrep pulseaudio
```

Sure enough, there was not. I checked the service's status in systemd:

```sh
systemctl --user status pulseaudio
```

The PulseAudio service was inactive/dead, so I attempted to start it and check the logs:

```sh
systemctl --user start pulseaudio
journalctl --user -xeu pulseaudio
```

And was met with a crashing PulseAudio, but with the very obvious error:

```
XDG_RUNTIME_DIR (/tmp) is not owned by us (uid 1000), but by uid 0! (This could e.g. happen if you try to connect to a non-root
```

...yeah. I'd had `XDG_RUNTIME_DIR` set to `/tmp` via my `.zshenv`. After some Googling on a more proper value to set for that variable, it seemed like the jury was still out, so I simply removed the explicit set from my `.zshenv`. Log out and back in, and boom - the PulseAudio systemd service starts up like a charm.

### Reenable Bluetooth

I then noticed that Bluetooth did not seem to be working; I opened up the Bluetooth settings pane and it was suspiciously blank, and there was also no KDE Plasma applet for Bluetooth in the menu bar. I'm still not quite sure why this was the case, but at some point in the past it seems that the Bluetooth systemd service was disabled. This was an easy fix:

```sh
sudo systemctl enable --now bluetooth
```

And Bluetooth returns.

### Pair AirPods

Attempting to pair the AirPods normally seemed to _almost_ work, but finishing the pairing process fails with `Failed to connect` (or something similar). After some more searching I found [this Reddit post][2], and followed the steps that were shown.

> Edit `/etc/bluetooth/main.conf` and change the `ControllerMode` setting, like so:
>
> ```
> ControllerMode: bredr
> ```

Following that, I restarted Bluetooth:

```sh
sudo systemctl restart bluetooth
```

Retried pairing the AirPods, and it totally worked!

### Coax sound out of the AirPods

Sound still was not able to be played using the AirPods though. It appeared I did not have PulseAudio Bluetooth support installed. After some investigation into _PipeWire_, I tried replacing PulseAudio with it, as it has Bluetooth suport built in - this did not work, and I just reverted to PulseAudio. Maybe some other time in the future. For now, I simply installed `pulseaudio-bluetooth`:

```sh
yay -S pulseaudio-bluetooth
```

The music starts, and the credits roll! ∎

### TODO: AirPods as a headset (ie, use the mic)

Haven't tried getting mic support working yet. If I do, I may update this section.

## Appendix: Current system info

Current system info (via `neofetch`):

```
                     ./o.                  pierce@bobbery
                   ./sssso-                --------------
                 `:osssssss+-              OS: EndeavourOS Linux x86_64
               `:+sssssssssso/.            Host: Razer Blade Stealth 13 Late 2019 2.04
             `-/ossssssssssssso/.          Kernel: 5.12.13-arch1-2
           `-/+sssssssssssssssso+:`        Uptime: 24 mins
         `-:/+sssssssssssssssssso+/.       Packages: 1131 (pacman)
       `.://osssssssssssssssssssso++-      Shell: zsh 5.8
      .://+ssssssssssssssssssssssso++:     Resolution: 3840x2160
    .:///ossssssssssssssssssssssssso++:    DE: Plasma 5.22.2
  `:////ssssssssssssssssssssssssssso---.   WM: KWin
`-////+ssssssssssssssssssssssssssso---+-   WM Theme: Breeze
 `..-+oosssssssssssssssssssssssso---++/`   Theme: Breeze Dark [Plasma], Breeze [GTK2/3]
   ./------------------------------/:.     Icons: breeze-dark [Plasma], breeze-dark [GTK2/3]
  `:::::::::::::::::::::::::------``       Terminal: tmux
                                           CPU: Intel i7-1065G7 (8) @ 3.900GHz
                                           GPU: NVIDIA GeForce GTX 1650 Mobile / Max-Q
                                           GPU: Intel Iris Plus Graphics G7
                                           Memory: 4918MiB / 15821MiB
```


[1]: https://github.com/pbar1/dotfiles
[2]: https://www.reddit.com/r/archlinux/comments/er9mb2/have_any_of_you_guys_tried_to_use_airpods/
