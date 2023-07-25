---
title: The SSH ForceCommand
pubDatetime: 2023-07-24
description: Dive into the OpenSSH escape hatch for injecting code into a command session
tags: ["ssh"]
---

It has been a while! 2022 came and went and this blog never saw a post. Since the last one I've been using SSH a great deal more because my day-to-day involves building tooling on top of and adjacent to it. One such little-known but highly powerful feature that we're going to dive into today is the humble `ForceCommand`!

## What is it?

ForceCommand is a configuration option exposed by OpenSSH that essentially runs the specified command _instead_ of the command given by the user. For example, if a host's `sshd_config` specifies `ForceCommand <cmd>`, then no matter what you do, `<cmd>` will always be executed instead of whatever command you request whenever you attempt to SSH to said host - even interactive sessions.

One likely example of this in the wild is GitHub. The Git protocol can work over SSH (in addition to HTTPS), and if you've ever wanted to test your auth config you may have seen something like this:

```
♪ ssh -T git@github.com
Hi pbar1! You've successfully authenticated, but GitHub does not provide shell access.
```

Or gotten curious and thought you might be able to get a shell on one of GitHub's servers 😜

```
♪ ssh git@github.com bash
Invalid command: bash
  You appear to be using ssh to clone a git:// URL.
  Make sure your core.gitProxy config option and the
  GIT_PROXY_COMMAND environment variable are NOT set.
```

Now I don't work at GitHub, but I'm willing to bet that this is implemented with a ForceCommand. We can recreate something pretty similar with the following code:

```sh
#!/bin/sh

set -e

if [ -z "${SSH_ORIGINAL_COMMAND}" ]; then
  echo "Hi ${USER}! You've successfully authenticated, but GitHub does not provide shell access."
  exit 1
else
  echo "Invalid command: ${SSH_ORIGINAL_COMMAND}"
  echo "  You appear to be using ssh to clone a git:// URL."
  echo "  Make sure your core.gitProxy config option and the"
  echo "  GIT_PROXY_COMMAND environment variable are NOT set."
  exit 1
fi
```

Assuming that script is available at `gh_forcecommand` on your PATH, you could then go and set `ForceCommand gh_forcecommand` to have your very own knockoff of GitHub's ForceCommand!

For more info, take a look at the manpage for [`sshd_config`][1] to see the docs, or run the following:

```sh
man -P 'less -p ForceCommand' sshd_config
```

## How do you use it?

You may have noticed the environment variable `SSH_ORIGINAL_COMMAND` being referenced in the example ForceCommand above. When your ForceCommand is executed, whatever the user's original desired command was gets placed into this environment variable. If they were trying to login with an interactive session, this variable is empty.

For example, if you've got a ForceCommand set and the user attempts to run `ssh user@host vim`, then the contents of `SSH_ORIGINAL_COMMAND` would be `vim`. If the user runs an interactive shell with just `ssh user@host`, then `SSH_ORIGINAL_COMMAND` will be empty.

## When to use it?

At the surface this little option seems simple, but the hook turns out to be surprisingly powerful as a way to run te equivalent of **middleware** for SSH connections. Because we have access to the original command the user was trying to run, we can inject custom code in between the SSH request and execution step of said command.

For example, one could think of a pretty simplistic ForceCommand that captures the incoming command and checks to see if it exists in an allowlist of some type, and blocks execution of the command unless it's allowed.

Where this strategy really starts to get interesting is when you consider [**SSH certificates**][2], the little-known but distinct cousin of the X.509 certificate. SSH certs can have critical options that define what exactly the holder of the cert can do, and one possible critical option that can be set [is the ForceCommand][3]. If I receive an SSH cert valid for a host and the cert embeds a ForceCommand, then the host in question question doesn't even need to define a ForceCommand via `sshd_config` to enforce policy on what can be run via SSH. Of course you'd need some way to mint SSH certificates such as HashiCorp Vault's [SSH Secret Engine][4]. These are the building blocks for running dynamic command authorization at scale.

SSH has rich _authentication_ mechanisms but does not provide much out of the box in terms of _authorization_, hence all the allusions here of that being the killer app that you can do with a ForceCommand. But authz certainly isn't the only thing you can do; here are a few more ideas to get your mind racing:

- Moving SSH sessions into isolated cgroups for resource quota accounting and enforcement
- Spawing SSH sessions in dynamically provisioned containers (like [ContainerSSH][5])
- Tracing SSH sessions on demand via eBPF (like [SSHLog][6])
- Performing fine-grained ACL checks on SSH command requests

## Why not something else?

You probably shouldn't reach for a ForceCommand if you just want to allowlist what commands someone run on a small number of machines or if said policy itself is relatively small. Despite its flaws and footguns, `sudoers` is good enough for a simple allowlist once you've got it configured properly.

As mentioned before, many of the use cases of a ForceCommand are supercharged if you've got the ability to mint SSH certificates. If you don't, then your ability to leverage ForceCommands will lose some of the dynamism that comes with the cert-attested identity. However, incoming identity-awareness is most useful in the case of authorization. For the aforementioned other possible use cases, that wouldn't be a requirement.

[1]: https://linux.die.net/man/5/sshd_config#:~:text=ForceCommand
[2]: https://en.wikibooks.org/wiki/OpenSSH/Cookbook/Certificate-based_Authentication
[3]: https://en.wikibooks.org/wiki/OpenSSH/Cookbook/Certificate-based_Authentication#Forced_Commands_with_User_Certificates
[4]: https://developer.hashicorp.com/vault/docs/secrets/ssh/signed-ssh-certificates
[5]: https://github.com/ContainerSSH/ContainerSSH
[6]: https://github.com/sshlog/agent
