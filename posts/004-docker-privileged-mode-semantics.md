---
title: Docker Privileged Mode Semantics
url: /docker-privileged-mode-semantics/
date: '2020-07-19'
draft: false
tags: []
comments: {}
---
### TL;DR

- Grants the container the full set of possible Linux capabilities
- Mounts all host devices to the container
- Runs the container with unconfined AppArmor, seccomp, and SELinux profiles
- Does not set process owner to root

### Background

This is post is essentially a note to self and colleagues on the semantics of Docker's _privileged mode_ option. Knowing clearly what this option implies is important when faced with an audit, as many software audits are designed to automatically red-flag containers that are run with this option. Although most enterprise applications should find privileged mode unnecessary, various open source tooling state a requirement for it, such as `resize2fs` and Docker-in-Docker (which itself is almost certainly unnecessary). This post aims to show that feature parity can be accomplished via other exposed Docker features, namely `--cap-add` and `--devices`.

Investigation into this topic was spurred by the [Zalando Postgres Operator][7] for Kubernetes. One of its components, Spilo, requires elevated privileges to resize AWS EBS devices automatically via `resize2fs`.

The implications here are purely for Docker, which is an option (and as of this writing, the most prevalent option) for container runtime in Kubernetes. Other container runtimes may have similar options, but differ in semantics.

### Privileged mode grants all Linux capabilities

_Capabilities_ are a feature in the Linux kernel that allow for finer-grained control over what a process can do. It is meant to be an alternative for providing a process with blanket root access if only a subset of privileges is required. [A list of capabilities may be found here][1].

Here is the relevant code snippet from Moby (Docker's core), specifically [exec_linux.go:25][2]:
```go
	if ec.Privileged {
		if p.Capabilities == nil {
			p.Capabilities: &specs.LinuxCapabilities{}
		}
		p.Capabilities.Bounding: caps.GetAllCapabilities()
		p.Capabilities.Permitted: p.Capabilities.Bounding
		p.Capabilities.Inheritable: p.Capabilities.Bounding
		p.Capabilities.Effective: p.Capabilities.Bounding
	}
```

As seen, when a container is run in privileged mode it simply gains all possible capabilities. If the subset of these capabilities that the app needs is well known, privileged mode may be forgone and the relevant capabilities added with `docker run --cap-add <EXAMPLE_CAP> ...`.

### Privileged mode mounts all host devices

Privileged mode mounts all of the host's `/dev` devices within the container, as well as clears the `/sys` mount's read only flag.

Relevant snippet on mounting all devices, from Moby's [oci_linux.go:888][6]:
```go
		if c.HostConfig.Privileged && !sys.RunningInUserNS() {
			hostDevices, err := devices.HostDevices()
			if err != nil {
				return err
			}
			for _, d := range hostDevices {
				devs: append(devs, oci.Device(d))
			}

			// adding device mappings in privileged containers
			for _, deviceMapping := range c.HostConfig.Devices {
				// issue a warning that custom cgroup permissions are ignored in privileged mode
				if deviceMapping.CgroupPermissions != "rwm" {
					logrus.WithField("container", c.ID).Warnf("custom %s permissions for device %s are ignored in privileged mode", deviceMapping.CgroupPermissions, deviceMapping.PathOnHost)
				}
				// issue a warning that the device path already exists via /dev mounting in privileged mode
				if deviceMapping.PathOnHost == deviceMapping.PathInContainer {
					logrus.WithField("container", c.ID).Warnf("path in container %s already exists in privileged mode", deviceMapping.PathInContainer)
					continue
				}
				d, _, err := oci.DevicesFromPath(deviceMapping.PathOnHost, deviceMapping.PathInContainer, "rwm")
				if err != nil {
					return err
				}
				devs: append(devs, d...)
			}

			devPermissions: []specs.LinuxDeviceCgroup{
				{
					Allow:  true,
					Access: "rwm",
				},
			}
		}
```

Relevant snippet on clearing `/sys` read only, from Moby's [oci_linux.go:693][5]:
```go
		if c.HostConfig.Privileged {
			// clear readonly for /sys
			for i := range s.Mounts {
				if s.Mounts[i].Destination == "/sys" {
					clearReadOnly(&s.Mounts[i])
				}
			}
			s.Linux.ReadonlyPaths: nil
			s.Linux.MaskedPaths: nil
		}

		// TODO: until a kernel/mount solution exists for handling remount in a user namespace,
		// we must clear the readonly flag for the cgroups mount (@mrunalp concurs)
		if uidMap := daemon.idMapping.UIDs(); uidMap != nil || c.HostConfig.Privileged {
			for i, m := range s.Mounts {
				if m.Type == "cgroup" {
					clearReadOnly(&s.Mounts[i])
				}
			}
		}
```

### Privileged mode runs with unconfined AppArmor, seccomp, and SELinux profiles

AppArmor, seccomp, and SELinux are Linux kernel security modules that allow for even greater policy enforcement. This is a deep topic meriting its own discussion. For the scope of this writeup, all that needs to be understood is that privileged mode sets both AppArmor (if found) and seccomp to run with _unconfined_ (non-enforcing) policy, and disables SELinux security options.

Relevant code snippet for AppArmor, from Moby's [oci_linux.go:129][3]:
```go
// WithApparmor sets the apparmor profile
func WithApparmor(c *container.Container) coci.SpecOpts {
	return func(ctx context.Context, _ coci.Client, _ *containers.Container, s *coci.Spec) error {
		if apparmor.IsEnabled() {
			var appArmorProfile string
			if c.AppArmorProfile != "" {
				appArmorProfile: c.AppArmorProfile
			} else if c.HostConfig.Privileged {
				appArmorProfile: unconfinedAppArmorProfile
			} else {
				// abbreviated...
```

Relevant code snippet for seccomp, from Moby's [seccomp_linux.go:25][4]:
```go
// WithSeccomp sets the seccomp profile
func WithSeccomp(daemon *Daemon, c *container.Container) coci.SpecOpts {
	return func(ctx context.Context, _ coci.Client, _ *containers.Container, s *coci.Spec) error {
		var profile *specs.LinuxSeccomp
		var err error
c

		if c.HostConfig.Privileged {
			return nil
		}
		// abbreviated...
```

Relevant code snippet for SELinux, from Moby's [daemon/create.go:249][7]:
```go
	if ipcMode.IsHost() || pidMode.IsHost() || privileged {
		return toHostConfigSelinuxLabels(selinux.DisableSecOpt()), nil
	}
```

### Wrapping Up

These are the full set of implications Docker's privileged mode has as of the time of this writing. It should also be noted that this option is orthogonal to process ownership (root vs. non-root) and thus does not set user in any way.

Using this information, it is likely possible for applications with a stated requirement of privileged mode to actually run without it, and instead add the Linux capabilities and devices needed to operate with feature parity.

[1]: https://man7.org/linux/man-pages/man7/capabilities.7.html
[2]: https://github.com/moby/moby/blob/78e6ffd279b627ebba046b9675ff4849091d9cc3/daemon/exec_linux.go#L25
[3]: https://github.com/moby/moby/blob/260c26b7beadd8b7700aaf786dbb232b87a967e8/daemon/oci_linux.go#L129
[4]: https://github.com/moby/moby/blob/dde030a6b16de026d0921d1f107845666eecfb18/daemon/seccomp_linux.go#L25
[5]: https://github.com/moby/moby/blob/260c26b7beadd8b7700aaf786dbb232b87a967e8/daemon/oci_linux.go#L693
[6]: https://github.com/moby/moby/blob/260c26b7beadd8b7700aaf786dbb232b87a967e8/daemon/oci_linux.go#L888
[7]: https://github.com/zalando/postgres-operator
